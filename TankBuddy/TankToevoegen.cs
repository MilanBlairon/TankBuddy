using System.Globalization;
using System.Windows;
using Newtonsoft.Json;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        private void Toevoegen_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                if (!string.IsNullOrEmpty(txbLiters.Text) &&
                    !string.IsNullOrEmpty(txbPrijsLiter.Text) &&
                    !string.IsNullOrEmpty(dpDatum.Text) &&
                    !string.IsNullOrEmpty(txbVerbruik.Text))
                {
                    if (cbxVoertuig.SelectedItem != null &&
                        cbxBrandstof.SelectedItem != null)
                    {
                        Voertuig geselecteerdVoertuig = (Voertuig)cbxVoertuig.SelectedItem;

                        double liters = double.Parse(txbLiters.Text.Replace(",", "."),
                                                     CultureInfo.InvariantCulture);
                        double prijsPerLiter =
                            double.Parse(txbPrijsLiter.Text.Replace(",", "."),
                                         CultureInfo.InvariantCulture);
                        double verbruik = double.Parse(txbVerbruik.Text.Replace(",", "."),
                                                       CultureInfo.InvariantCulture);

                        DateTime selectedDate =
                            dpDatum.SelectedDate ?? DateTime
                                .Today;  // Get the selected date from the DatePicker

                        Tank tank = new Tank
                        {
                            Voertuig = geselecteerdVoertuig
                                           .NaamVoorOpslag,  // Alleen de naam opslaan
                            Liters = liters,
                            PrijsPerLiter = prijsPerLiter,
                            Datum = selectedDate,
                            Verbruik = verbruik,
                            Brandstof = cbxBrandstof.SelectedItem.ToString()
                        };

                        // Voeg de tank toe aan de lijst
                        tankGeschiedenis.Add(tank);

                        // Converteer naar JSON en schrijf naar bestand zoals eerder
                        string json = JsonConvert.SerializeObject(
                            tank,
                            new JsonSerializerSettings
                            {
                                DateFormatString = "yyyy-MM-dd"  // Formateer de datum
                            });
                        SchrijfNaarBestand(json);

                        // Toon de bijgewerkte tankgeschiedenis
                        ToonTankGeschiedenis();  // Voeg deze regel toe
                        UpdateGrafiek();
                    }
                    else
                    {
                        MessageBox.Show("Selecteer een voertuig en brandstof.");
                    }
                }
                else
                {
                    MessageBox.Show("Gelieve alle velden in te vullen.");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }
        private void VoegToeAanGeschiedenis(Tank tank)
        {
            try
            {
                // Voeg tank toe aan ObservableCollection
                tankGeschiedenis.Add(tank);

                // Update de grafiek
                UpdateGrafiek();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Er is een fout bij de methode VoegToeAanGeschiedenis(): " +
                    ex.Message);
            }
        }
    }
}