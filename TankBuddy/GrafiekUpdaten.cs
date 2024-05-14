using System.Windows;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        // Update de grafiek telkens wanneer nieuwe data wordt toegevoegd
        private void UpdateGrafiek()
        {
            GemiddeldVerbruikMaandGrafiek.Series.Clear();
            LitersPerMaandGrafiek.Series.Clear();
            TekenVerbruikPerVoertuigGrafiek();  // Teken de grafiek opnieuw
            TekenLitersPerMaandGrafiek();
        }
    }
}