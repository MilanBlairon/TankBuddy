using HtmlAgilityPack;
using Newtonsoft.Json;
using System.IO;
using System.Windows;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        private const string bestandsnaam = "tankgeschiedenis.json";
        private List<string> nummerplaten = new List<string>(); // Nieuwe lijst voor nummerplaten

        public MainWindow()
        {
            InitializeComponent();
            ActuelePrijsEuro95();

            // Lees bestaande gegevens uit het bestand
            if (File.Exists(bestandsnaam))
            {
                LeesTankGeschiedenis();
            }

            // Voeg nummerplaten toe aan List<string>
            VoegNummerplatenToe("Nummerplaat 1");
            VoegNummerplatenToe("Nummerplaat 2");
            VoegNummerplatenToe("Nummerplaat 3");
            VoegNummerplatenToe("Nummerplaat 4");
            VoegNummerplatenToe("Nummerplaat 6");

            // Voeg nummerplaten toe aan ComboBox
            cbxVoertuig.ItemsSource = nummerplaten;

            // Voeg brandstoffen toe aan ComboBox cbxBrandstof
            cbxBrandstof.Items.Add("Diesel");
            cbxBrandstof.Items.Add("Euro 95");
            cbxBrandstof.Items.Add("Euro 98");
            cbxBrandstof.Items.Add("Euro 102");
        }


        private void ActuelePrijsEuro95()
        {
            try
            {
                // URL van de website waaruit je de tankprijzen wilt halen
                string url = "https://carbu.com/belgie//liste-stations-service/E10/Izegem/8870/BE_foc_2503/76";

                // HTML-document laden van de URL
                HtmlWeb web = new HtmlWeb();
                HtmlDocument document = web.Load(url);

                // XPath-query om de elementen te selecteren die de tankprijzen bevatten
                string xpathQuery = "/html/body/main/section/div/div/div/div/div[1]/div[2]/div/div/div/div/div[5]/span[2]";

                // Selecteer het eerste element dat de tankprijs bevat
                HtmlNode priceNode = document.DocumentNode.SelectSingleNode(xpathQuery);

                // Als het element is gevonden, haal de prijs op en stel deze in op de Label
                if (priceNode != null)
                {
                    string tankPrijs = priceNode.InnerText.Trim();
                    // Vervang "&euro;" door het euroteken en voeg de juiste opmaak toe
                    tankPrijs = tankPrijs.Replace("&euro;", "€");
                    lblActuelePrijsEuro95.Content = "Euro 95: " + tankPrijs;
                }
                else
                {
                    lblActuelePrijsEuro95.Content = "Tankprijs niet gevonden";
                }
            }
            catch (Exception ex)
            {
                lblActuelePrijsEuro95.Content = "Fout bij het ophalen van tankprijzen: " + ex.Message;
            }
        }


        private void VoegNummerplatenToe(string nummerplaat)
        {
            nummerplaten.Add(nummerplaat);
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
                        Verbruik = double.Parse(txbVerbruik.Text),
                        Brandstof = cbxBrandstof.SelectedItem.ToString() // Brandstof uit ComboBox
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
            lstGeschiedenis.Items.Add($"{tank.Voertuig} - {tank.Liters}L - €{tank.PrijsPerLiter}/L - {tank.Datum.ToString("dd/MM/yyyy")} - {tank.Verbruik}L/100km - {tank.Brandstof}");
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
        public string Brandstof { get; set; }
    }
}