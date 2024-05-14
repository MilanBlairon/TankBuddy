using System.Windows;
using System.Windows.Controls;

namespace TankBuddy
{
    public partial class MainWindow : Window
    {
        private void ToonTankGeschiedenis()
        {
            try
            {
                // Sorteer de tankgeschiedenis op datum voordat je deze toewijst aan de
                // datagrid
                var gesorteerdeTankGeschiedenis =
                    tankGeschiedenis.OrderByDescending(t => t.Datum).ToList();
                dgGeschiedenis.ItemsSource = gesorteerdeTankGeschiedenis;

                // Automatisch aanpassen van de breedte van de kolommen aan de inhoud
                foreach (var column in dgGeschiedenis.Columns)
                {
                    column.Width = new DataGridLength(1, DataGridLengthUnitType.Auto);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Er is een fout bij de methode ToonTankGeschiedenis(): " + ex.Message);
            }
        }
    }
}