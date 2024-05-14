using System.Windows;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        // Voeg nummerplaten toe met OVERERVING
        private void VoegNummerplatenToe(Voertuig voertuig)
        {
            try
            {
                nummerplaten.Add(voertuig);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Er is een fout bij de methode VoegNummerplatenToe(): " + ex.Message);
            }
        }
    }
}
