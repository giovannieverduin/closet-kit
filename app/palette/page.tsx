import Shell from "@/components/Shell";
import PaletteView from "@/components/PaletteView";

export const metadata = { title: "Your Palette — The Wardrobe" };

export default function Palette() {
  return (
    <Shell>
      <PaletteView />
    </Shell>
  );
}
