using HtmlAgilityPack;
using System.Windows;
using System.Windows.Controls;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        private void ActuelePrijzen()
        {
            try
            {
                // Haal prijzen bij carbu.com want xPath naar actuele prijzen niet
                // onmiddelijk beschikbaar bij website dats24.be... Na meermaals checken
                // lijken de prijzen bij carbu.com up-to-date te zijn!
                ActuelePrijsZoeken(
                    "Euro 95",
                    "https://carbu.com/belgie//liste-stations-service/E10/Izegem/8870/BE_foc_2503/76",
                    lblActuelePrijsEuro95);
                ActuelePrijsZoeken(
                    "Euro 98",
                    "https://carbu.com/belgie//liste-stations-service/SP98/Izegem/8870/BE_foc_2503/76",
                    lblActuelePrijsEuro98);
                ActuelePrijsZoeken(
                    "Diesel",
                    "https://carbu.com/belgie//liste-stations-service/GO/Izegem/8870/BE_foc_2503/76",
                    lblActuelePrijsDiesel);
                PrijsGeschiedenisGrafiekTekenen();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Er is een fout bij de methode ActuelePrijzen(): " +
                                ex.Message);
            }
        }
        private void ActuelePrijsZoeken(string brandstofType, string url, Label label)
        {
            try
            {
                // HTML-document laden van de URL
                HtmlWeb web = new HtmlWeb();
                HtmlDocument document = web.Load(url);

                // XPath-query om de elementen te selecteren die de tankprijzen bevatten
                string xpathQuery = "/html/body/main/section/div/div/div/div/div[1]/div[2]/div/div/div/div/div[5]/span[2]";

                // Selecteer het eerste element dat de tankprijs bevat
                HtmlNode priceNode = document.DocumentNode.SelectSingleNode(xpathQuery);

                // Als het element is gevonden, haal de prijs op en stel deze in op de
                // Label
                if (priceNode != null)
                {
                    string tankPrijs = priceNode.InnerText.Trim();
                    // Vervang "&euro;" door het euroteken en voeg de juiste opmaak toe
                    tankPrijs = tankPrijs.Replace("&euro;", "€");
                    label.Content = $"{brandstofType}: {tankPrijs}";

                    // Schrijf de prijs naar het prijsgeschiedenisbestand
                    SchrijfPrijsNaarBestand(brandstofType, tankPrijs);
                }
                else
                {
                    label.Content = "Tankprijs niet gevonden";
                }
            }
            catch (Exception ex)
            {
                label.Content = $"Fout bij het ophalen van tankprijzen voor {brandstofType}: {ex.Message}";
            }
        }
    }
}
