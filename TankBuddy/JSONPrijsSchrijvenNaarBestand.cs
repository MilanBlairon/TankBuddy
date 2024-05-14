using Newtonsoft.Json;
using System.IO;
using System.Windows;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        private void SchrijfPrijsNaarBestand(string brandstofType, string prijs)
        {
            try
            {
                string huidigeDatum = DateTime.Now.ToString("dd-MM-yyyy");
                var nieuwePrijsData =
                    new
                    {
                        Datum = huidigeDatum,
                        Brandstof = brandstofType.Replace(" ", ""),
                        Prijs = prijs.Replace(" €/L", "")
                    };

                List<dynamic> bestandsInhoud = new List<dynamic>();

                // Controleer of het bestand al bestaat
                if (File.Exists(prijsgeschiedenisJSON))
                {
                    // Lees de huidige inhoud van het JSON-bestand
                    string jsonText = File.ReadAllText(prijsgeschiedenisJSON);

                    // Deserialiseer de inhoud naar een lijst van objecten
                    bestandsInhoud = JsonConvert.DeserializeObject<List<dynamic>>(jsonText);
                }

                // Zoek of er al gegevens zijn voor de huidige datum en brandstof
                bool datumGevonden = false;
                for (int i = 0; i < bestandsInhoud.Count; i++)
                {
                    if (bestandsInhoud[i]
                            ["Datum"]
                                .ToString() == huidigeDatum &&
                        bestandsInhoud[i]
                            ["Brandstof"]
                                .ToString() == nieuwePrijsData.Brandstof)
                    {
                        // Overschrijf de bestaande gegevens voor deze datum met de
                        // nieuwe prijs
                        bestandsInhoud[i]
                        ["Prijs"] = nieuwePrijsData.Prijs;
                        datumGevonden = true;
                        break;
                    }
                }

                // Als er geen gegevens zijn voor de huidige datum, voeg dan nieuwe
                // gegevens toe
                if (!datumGevonden)
                {
                    bestandsInhoud.Add(nieuwePrijsData);
                }

                // Serialiseer de gegevens naar JSON
                string jsonData =
                    JsonConvert.SerializeObject(bestandsInhoud, Formatting.Indented);

                // Schrijf de bijgewerkte inhoud terug naar het bestand
                File.WriteAllText(prijsgeschiedenisJSON, jsonData);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Fout bij het schrijven naar het bestand: " + ex.Message);
            }
        }
    }
}