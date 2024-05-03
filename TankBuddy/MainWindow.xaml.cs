using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Windows;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        private const string bestandsnaam = "tankgeschiedenis.json";

        public MainWindow()
        {
            InitializeComponent();

            // Lees bestaande gegevens uit het bestand
            if (File.Exists(bestandsnaam))
            {
                LeesTankGeschiedenis();
            }

            // Voeg nummerplaten toe aan ComboBox
            cbxVoertuig.Items.Add("Nummerplaat 1");
            cbxVoertuig.Items.Add("Nummerplaat 2");
            cbxVoertuig.Items.Add("Nummerplaat 3");
        }

        private void LeesTankGeschiedenis()
        {
            try
            {
                using (StreamReader sr = new StreamReader(bestandsnaam))
                {
                    string lijn;
                    while ((lijn = sr.ReadLine()) != null)
                    {
                        // Deserialize JSON-lijn naar Tank-object
                        Tank tank = JsonConvert.DeserializeObject<Tank>(lijn);

                        // Voeg tank toe aan ListBox
                        VoegToeAanGeschiedenis(tank);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Fout bij het lezen van het bestand: " + ex.Message);
            }
        }

        private void Toevoegen_Click(object sender, RoutedEventArgs e)
        {
            // Controleer of alle tekstvakken zijn ingevuld
            if (!string.IsNullOrEmpty(txbLiters.Text) && !string.IsNullOrEmpty(txbPrijsLiter.Text) && !string.IsNullOrEmpty(txbDatum.Text) && !string.IsNullOrEmpty(txbVerbruik.Text))
            {
                // Controleer of er een item is geselecteerd in de ComboBox
                if (cbxVoertuig.SelectedItem != null)
                {
                    // Maak een nieuw tankobject aan
                    Tank tank = new Tank
                    {
                        Voertuig = cbxVoertuig.SelectedItem.ToString(), // Voertuignaam uit ComboBox
                        Liters = double.Parse(txbLiters.Text),
                        PrijsPerLiter = double.Parse(txbPrijsLiter.Text),
                        Datum = DateTime.Parse(txbDatum.Text),
                        Verbruik = double.Parse(txbVerbruik.Text)
                    };

                    // Voeg tank toe aan geschiedenis
                    VoegToeAanGeschiedenis(tank);

                    // Converteer naar JSON
                    string json = JsonConvert.SerializeObject(tank);

                    // Schrijf JSON naar bestand
                    SchrijfNaarBestand(json);
                }
                else
                {
                    MessageBox.Show("Selecteer een voertuig.");
                }
            }
            else
            {
                MessageBox.Show("Gelieve alle velden in te vullen.");
            }
        }

        private void VoegToeAanGeschiedenis(Tank tank)
        {
            // Voeg tank toe aan ListBox
            lstGeschiedenis.Items.Add($"{tank.Voertuig} - {tank.Liters}L - €{tank.PrijsPerLiter}/L - {tank.Datum.ToString("dd/MM/yyyy")} - {tank.Verbruik}L/100km");
        }

        private void SchrijfNaarBestand(string data)
        {
            try
            {
                using (StreamWriter sw = File.AppendText(bestandsnaam))
                {
                    sw.WriteLine(data);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Fout bij het schrijven naar het bestand: " + ex.Message);
            }
        }
    }

    public class Tank
    {
        public string Voertuig { get; set; }
        public double Liters { get; set; }
        public double PrijsPerLiter { get; set; }
        public DateTime Datum { get; set; }
        public double Verbruik { get; set; }
    }
}
