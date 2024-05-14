using System.Windows;
using LiveCharts;
using LiveCharts.Wpf;
using System.Globalization;
using Separator = LiveCharts.Wpf.Separator;
using System.Windows.Media;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        // Event handler voor de knop "Reset Zoom" klik voor de liters per maand
        private void ResetZoomLiters_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Controleer of de grafiek aanwezig is
                if (LitersPerMaandGrafiek != null)
                {
                    // Loop door elke as in de grafiek
                    foreach (var axisX in LitersPerMaandGrafiek.AxisX)
                    {
                        // Reset de zoom op de x-as
                        axisX.MinValue = double.NaN;
                        axisX.MaxValue = double.NaN;
                    }

                    foreach (var axisY in LitersPerMaandGrafiek.AxisY)
                    {
                        // Reset de zoom op de y-as
                        axisY.MinValue = double.NaN;
                        axisY.MaxValue = double.NaN;
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Er is een fout opgetreden bij het resetten van de zoom: {ex.Message}");
            }
        }
        // Methode om de grafiek voor liters per maand te tekenen
        private void TekenLitersPerMaandGrafiek()
        {
            try
            {
                // Verzamel de gegevens per maand en per voertuig
                Dictionary<string, Dictionary<string, double>> litersPerMaandPerVoertuig =
                    new Dictionary<string, Dictionary<string, double>>();

                foreach (var tank in tankGeschiedenis)
                {
                    string maandJaar = tank.Datum.ToString("MM-yyyy");
                    if (!litersPerMaandPerVoertuig.ContainsKey(tank.Voertuig))
                    {
                        litersPerMaandPerVoertuig.Add(tank.Voertuig,
                                                      new Dictionary<string, double>());
                    }

                    var voertuigDict = litersPerMaandPerVoertuig[tank.Voertuig];

                    if (!voertuigDict.ContainsKey(maandJaar))
                    {
                        voertuigDict.Add(maandJaar, tank.Liters);
                    }
                    else
                    {
                        voertuigDict[maandJaar] += tank.Liters;
                    }
                }

                // Sorteer de maanden en jaren oplopend
                var sortedMaandenJaar =
                    litersPerMaandPerVoertuig.SelectMany(voertuig => voertuig.Value.Keys)
                        .Distinct()
                        .OrderBy(maandJaar => DateTime.ParseExact(
                                     maandJaar, "MM-yyyy", CultureInfo.InvariantCulture))
                        .ToList();

                // Maak de grafiekgegevens aan
                SeriesCollection seriesCollection = new SeriesCollection();
                List<string> voertuigen = litersPerMaandPerVoertuig.Keys.ToList();

                foreach (var voertuig in voertuigen)
                {
                    var voertuigData = new ChartValues<double>();

                    foreach (var maandJaar in sortedMaandenJaar)
                    {
                        double liters = 0;
                        if (litersPerMaandPerVoertuig[voertuig]
                                .ContainsKey(maandJaar))
                        {
                            liters = litersPerMaandPerVoertuig[voertuig]
                            [maandJaar];
                        }
                        voertuigData.Add(liters);
                    }

                    seriesCollection.Add(new ColumnSeries
                    {
                        Title = voertuig,
                        Values = voertuigData,
                        DataLabels = true,
                        LabelPoint = point => point.Y.ToString(
                            "N2")  // Opmaak voor data labels, afgerond op 0.01
                    });
                }

                // Stel de grafiek in
                LitersPerMaandGrafiek.Series = seriesCollection;

                // Pas de labels van de X-as aan om de maand en het jaar weer te geven
                LitersPerMaandGrafiek.AxisX.Clear();
                LitersPerMaandGrafiek.AxisX.Add(new Axis
                {
                    Title = "Maand & Jaar",
                    Labels = sortedMaandenJaar,
                    Separator = new Separator { Step = 1 },  // Gebruik een stap van 1 maand
                    Foreground = Brushes.LightGray        // Kleur van de asstrepen
                });

                // Pas de labels van de Y-as aan om de liters weer te geven
                LitersPerMaandGrafiek.AxisY.Clear();
                LitersPerMaandGrafiek.AxisY.Add(new Axis
                {
                    Title = "Liters",
                    LabelFormatter = value =>
                        value.ToString("N2"),  // Opmaak van de Y-as, afgerond op 0.01
                    Foreground = Brushes.LightGray,  // Kleur van de asstrepen
                    MinValue = 0 // Zorg ervoor dat de Y-as begint vanaf 0
                });


                // Pas de stijl van de asstrepen aan voor de X-as
                LitersPerMaandGrafiek.AxisX[0].Separator.StrokeThickness = 0;

                // Pas de stijl van de asstrepen aan voor de Y-as
                LitersPerMaandGrafiek.AxisY[0].Separator.StrokeThickness = 1;

                // Schakel zoomen en slepen in
                LitersPerMaandGrafiek.Zoom = ZoomingOptions.X;
                LitersPerMaandGrafiek.Pan = PanningOptions.X;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Er is een fout opgetreden bij het tekenen van de grafiek: {ex.Message}");
            }
        }
    }
}
