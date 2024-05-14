using System.Windows;
using System.IO;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        private void SchrijfNaarBestand(string data)
        {
            try
            {
                using (StreamWriter sw = File.AppendText(tankgeschiedenisJSON))
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
}