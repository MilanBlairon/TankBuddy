using System.IO;
using System.Windows;
using System.Collections.ObjectModel;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        // JSON bestanden
        private const string tankgeschiedenisJSON = "tankgeschiedenis.json";
        private const string prijsgeschiedenisJSON = "prijsgeschiedenis.json";

        // Voertuigenlijst List<string>
        private List<Voertuig> nummerplaten = new List<Voertuig>(); 

        private ObservableCollection<Tank> tankGeschiedenis = new ObservableCollection<Tank>();

        public MainWindow()
        {
            InitializeComponent();

            try
            {
                ActuelePrijzen();

                // Lees bestaande gegevens uit het tankgeschiedenisJSON bestand
                if (File.Exists(tankgeschiedenisJSON))
                {
                    LeesTankGeschiedenis();
                }

                // Voeg voertuigen en nummerplaten toe met OVERERVING uit apparte klasses
                Voertuig bmwX6 = new BMWX6("1-WBQ-481");
                VoegNummerplatenToe(bmwX6);

                Voertuig renaultTrafic = new RenaultTrafic("2-DGR-447");
                VoegNummerplatenToe(renaultTrafic);

                Voertuig citroënBerlingo = new CitroënBerlingo("XEK-657");
                VoegNummerplatenToe(citroënBerlingo);

                // Voeg nummerplaten toe aan ComboBox
                cbxVoertuig.ItemsSource = nummerplaten;

                // Voeg brandstoffen toe aan ComboBox cbxBrandstof
                cbxBrandstof.Items.Add("Diesel");
                cbxBrandstof.Items.Add("Euro 95");
                cbxBrandstof.Items.Add("Euro 98");
                cbxBrandstof.Items.Add("Euro 102");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Er is een fout bij het initialiseren: " + ex.Message);
            }
        }        
    }
}