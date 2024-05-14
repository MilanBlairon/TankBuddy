namespace TankBuddy
{
    // Base class Voertuig
    public class Voertuig
    {
        public string Naam { get; set; }
        public string Nummerplaat { get; set; }

        public Voertuig(string naam, string nummerplaat)
        {
            Naam = naam;
            Nummerplaat = nummerplaat;
        }

        public override string ToString()
        {
            return $"{Naam} ({Nummerplaat})"; // Return both name and number plate
        }

        public string NaamVoorOpslag => Naam; // Property om alleen de naam op te slaan
    }
}
