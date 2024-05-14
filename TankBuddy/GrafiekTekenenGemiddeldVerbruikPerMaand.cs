using LiveCharts.Wpf;
using LiveCharts;
using System.Globalization;
using System.Windows.Media;
using System.Windows;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        // Event handler voor de knop "Reset Zoom" klik
        private void ResetZoomVerbruik_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                // Controleer of de grafiek aanwezig is
                if (GemiddeldVerbruikMaandGrafiek != null)
                {
                    // Loop door elke as in de grafiek
                    foreach (var axisX in GemiddeldVerbruikMaandGrafiek.AxisX)
                    {
                        // Reset de zoom op de x-as
                        axisX.MinValue = double.NaN;
                        axisX.MaxValue = double.NaN;
                    }

                    foreach (var axisY in GemiddeldVerbruikMaandGrafiek.AxisY)
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
        // Methode om het gemiddelde verbruik per maand te berekenen
        private Dictionary<string, double> BerekenGemiddeldVerbruikPerMaand()
        {
            Dictionary<string, double> gemiddeldVerbruikPerMaand =
                new Dictionary<string, double>();

            foreach (var tank in tankGeschiedenis)
            {
                string maandJaar = tank.Datum.ToString("MM-yyyy");
                if (!gemiddeldVerbruikPerMaand.ContainsKey(maandJaar))
                {
                    gemiddeldVerbruikPerMaand.Add(maandJaar, tank.Verbruik);
                }
                else
                {
                    gemiddeldVerbruikPerMaand[maandJaar] += tank.Verbruik;
                }
            }

            foreach (var key in gemiddeldVerbruikPerMaand.Keys.ToList())
            {
                gemiddeldVerbruikPerMaand[key] /=
                    tankGeschiedenis.Count(t => t.Datum.ToString("MM-yyyy") == key);
            }

            return gemiddeldVerbruikPerMaand;
        }

        private void TekenVerbruikPerVoertuigGrafiek()
        {
            // Verzamel de verbruiksgegevens per maand en voertuig
            Dictionary<string, Dictionary<string, List<double>>>
                verbruikPerMaandEnVoertuig =
                    new Dictionary<string, Dictionary<string, List<double>>>();

            foreach (var tank in tankGeschiedenis)
            {
                string maandJaar = tank.Datum.ToString("MM-yyyy");
                string voertuigNaam = tank.Voertuig;

                if (!verbruikPerMaandEnVoertuig.ContainsKey(maandJaar))
                {
                    verbruikPerMaandEnVoertuig.Add(maandJaar,
                                                   new Dictionary<string, List<double>>());
                }

                if (!verbruikPerMaandEnVoertuig[maandJaar]
                         .ContainsKey(voertuigNaam))
                {
                    verbruikPerMaandEnVoertuig[maandJaar]
                        .Add(voertuigNaam, new List<double>());
                }

                verbruikPerMaandEnVoertuig[maandJaar]
                [voertuigNaam]
                    .Add(tank.Verbruik);
            }

            // Sorteer de maanden en jaren oplopend
            var sortedMaandenJaar =
                verbruikPerMaandEnVoertuig.Keys
                    .OrderBy(maandJaar => DateTime.ParseExact(
                                 maandJaar, "MM-yyyy", CultureInfo.InvariantCulture))
                    .ToList();

            // Maak de grafiekgegevens aan
            SeriesCollection seriesCollection = new SeriesCollection();
            List<string> voertuigen =
                tankGeschiedenis.Select(tank => tank.Voertuig).Distinct().ToList();

            foreach (var voertuig in voertuigen)
            {
                var verbruik = new ChartValues<double>();
                var dataLabels = new ChartValues<double>();

                foreach (var maandJaar in sortedMaandenJaar)
                {
                    double gemiddeld = 0;
                    if (verbruikPerMaandEnVoertuig[maandJaar]
                            .ContainsKey(voertuig))
                    {
                        var totaalVerbruik = verbruikPerMaandEnVoertuig[maandJaar]
                                             [voertuig]
                                                 .Sum();
                        var aantalTankbeurten = verbruikPerMaandEnVoertuig[maandJaar]
                                                [voertuig]
                                                    .Count;
                        gemiddeld = totaalVerbruik / aantalTankbeurten;
                    }
                    verbruik.Add(gemiddeld);
                    dataLabels.Add(gemiddeld);  // Voeg gemiddelde toe aan data labels
                }

                seriesCollection.Add(new ColumnSeries
                {
                    Title = voertuig,
                    Values = verbruik,
                    DataLabels = true,  // Gebruik data labels
                    LabelPoint = point =>
                        point.Y.ToString("N1")  // Opmaak voor data labels
                });
            }

            // Stel de grafiek in
            GemiddeldVerbruikMaandGrafiek.Series = seriesCollection;

            // Pas de labels van de X-as aan om de maand en het jaar weer te geven
            GemiddeldVerbruikMaandGrafiek.AxisX.Clear();
            GemiddeldVerbruikMaandGrafiek.AxisX.Add(new Axis
            {
                Title = "Maand & Jaar",
                Labels = sortedMaandenJaar,
                Separator = new Separator { Step = 1 },  // Gebruik een stap van 1 maand
                Foreground = Brushes.LightGray        // Kleur van de asstrepen
            });

            // Pas de labels van de Y-as aan om het gemiddelde verbruik weer te geven
            GemiddeldVerbruikMaandGrafiek.AxisY.Clear();
            GemiddeldVerbruikMaandGrafiek.AxisY.Add(new Axis
            {
                Title = "Gemiddeld Verbruik (L/100km)",
                LabelFormatter = value => value.ToString("N1"),  // Opmaak van de Y-as
                Foreground = Brushes.LightGray,  // Kleur van de asstrepen
                MinValue = 0 // Zorg ervoor dat de Y-as begint vanaf 0
            });

            // Pas de stijl van de asstrepen aan voor de X-as
            GemiddeldVerbruikMaandGrafiek.AxisX[0].Separator.StrokeThickness = 0;

            // Pas de stijl van de asstrepen aan voor de Y-as
            GemiddeldVerbruikMaandGrafiek.AxisY[0].Separator.StrokeThickness = 1;

            // Schakel zoomen en slepen in
            GemiddeldVerbruikMaandGrafiek.Zoom = ZoomingOptions.X;
            GemiddeldVerbruikMaandGrafiek.Pan = PanningOptions.X;
        }
    }
}