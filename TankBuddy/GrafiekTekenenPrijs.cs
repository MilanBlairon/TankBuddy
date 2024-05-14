using Newtonsoft.Json;
using System.IO;
using System.Windows;
using LiveCharts;
using LiveCharts.Wpf;
using System.Globalization;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        // Event handler voor de knop "Reset Zoom" klik
        private void ResetZoomPrijs_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Controleer of de grafiek aanwezig is
                if (Chart != null)
                {
                    // Loop door elke as in de grafiek
                    foreach (var @as in Chart.AxisX)
                    {
                        // Reset de zoom op de x-as
                        @as.MinValue = double.NaN;
                        @as.MaxValue = double.NaN;
                    }

                    foreach (var @as in Chart.AxisY)
                    {
                        // Reset de zoom op de y-as
                        @as.MinValue = double.NaN;
                        @as.MaxValue = double.NaN;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Er is een fout bij de methode ResetZoomPrijs_Click(): " + ex.Message);
            }
        }
        private void PrijsGeschiedenisGrafiekTekenen()
        {
            try
            {
                // JSON-data inlezen vanuit het bestand
                var prijsGeschiedenis = File.ReadAllText(prijsgeschiedenisJSON);
                var brandstofPrijsGeschiedenis =
                    JsonConvert.DeserializeObject<List<BrandstofPrijsGeschiedenis>>(
                        prijsGeschiedenis);

                // Data voor de grafiek
                var dieselPrijsGeschiedenis = new ChartValues<double>();
                var euro95PrijsGeschiedenis = new ChartValues<double>();
                var euro98PrijsGeschiedenis = new ChartValues<double>();
                var grafiekAssenPrijsgeschiedenis = new List<string>();

                foreach (var brandstofPrijs in brandstofPrijsGeschiedenis)
                {
                    var datumFormaat = DateTime
                                           .ParseExact(brandstofPrijs.Datum, "dd-MM-yyyy",
                                                       CultureInfo.InvariantCulture)
                                           .ToString("dd-MM");
                    if (!grafiekAssenPrijsgeschiedenis.Contains(datumFormaat))
                        grafiekAssenPrijsgeschiedenis.Add(datumFormaat);

                    // Prijs afronden op drie decimalen (0.000)
                    var prijsAfronding =
                        Math.Round(double.Parse(brandstofPrijs.Prijs.Replace(",", "."),
                                                CultureInfo.InvariantCulture),
                                   3);

                    if (brandstofPrijs.Brandstof == "Diesel")
                        dieselPrijsGeschiedenis.Add(prijsAfronding);
                    else if (brandstofPrijs.Brandstof == "Euro95")
                        euro95PrijsGeschiedenis.Add(prijsAfronding);
                    else if (brandstofPrijs.Brandstof == "Euro98")
                        euro98PrijsGeschiedenis.Add(prijsAfronding);
                }

                // Sorteer de legenda-items op basis van de waarde van het laatste
                // datapunt
                var sortedSeries =
                    new List<(string Brandstof, ChartValues<double> Values)>{
              ("Diesel", dieselPrijsGeschiedenis),
              ("Euro 95", euro95PrijsGeschiedenis),
              ("Euro 98", euro98PrijsGeschiedenis)}
                        .OrderByDescending(series => series.Values.Last())
                        .ToList();

                // Verwijder de huidige series uit de grafiek
                Chart.Series.Clear();

                // Assen definities
                var xAsPrijsGeschiedenis =
                    new Axis { Title = "Datum", Labels = grafiekAssenPrijsgeschiedenis };
                var yAsPrijsGeschiedenis =
                    new Axis
                    {
                        Title = "Prijs",
                        LabelFormatter = value => value.ToString(
                                                  "0.000", CultureInfo.CurrentCulture)
                    };

                // Toevoegen van de assen en series aan de grafiek, waarbij de
                // legenda-items nu gesorteerd zijn op basis van de hoogste waarde
                foreach (var series in sortedSeries)
                {
                    var lineSeries =
                        new LineSeries { Title = series.Brandstof, Values = series.Values };
                    Chart.Series.Add(lineSeries);
                }

                Chart.AxisX.Add(xAsPrijsGeschiedenis);
                Chart.AxisY.Add(yAsPrijsGeschiedenis);

                // Zooming options instellen
                Chart.Zoom = ZoomingOptions.X;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Er is een fout bij de methode PrijsGeschiedenisGrafiekTekenen(): {ex.Message}");
            }
        }
    }
}