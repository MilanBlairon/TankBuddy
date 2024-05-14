using System.Windows;
using Newtonsoft.Json;
using System.IO;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        private void LeesTankGeschiedenis()
        {
            try
            {
                if (File.Exists(tankgeschiedenisJSON))
                {
                    using (StreamReader sr = new StreamReader(tankgeschiedenisJSON))
                    {
                        string lijn;
                        while ((lijn = sr.ReadLine()) != null)
                        {
                            Tank tank = JsonConvert.DeserializeObject<Tank>(lijn);
                            tankGeschiedenis.Add(tank);
                        }
                    }

                    // Toon de tankgeschiedenis in de DataGrid na het inlezen
                    ToonTankGeschiedenis();

                    TekenVerbruikPerVoertuigGrafiek();
                    TekenLitersPerMaandGrafiek();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Fout bij het lezen van het bestand: " + ex.Message);
            }
        }
    }
}