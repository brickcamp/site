import os

# === Konfiguration ===
wurzelverzeichnis = "content/entries"  # <-- Anpassen!
einfügezeile      = 5  # Zeilennummer, an der eingefügt werden soll (1-basiert)

# ======================

def verarbeite_markdown_datei(pfad, ordnername):
    with open(pfad, "r", encoding="utf-8") as f:
        zeilen = f.readlines()

    aliases_zeile = f"aliases = ['/tech/{ordnername}']\n"

    if aliases_zeile in zeilen:
        print(f"Überspringe (bereits vorhanden): {pfad}")
        return

    zeilen.insert(einfügezeile - 1, aliases_zeile)

    with open(pfad, "w", encoding="utf-8") as f:
        f.writelines(zeilen)

    print(f"Eingefügt in: {pfad}")

def durchsuche_ordner(wurzelverzeichnis):
    for root, dirs, files in os.walk(wurzelverzeichnis):
        for datei in files:
            if datei.endswith(".md"):
                ordnername = os.path.basename(root)
                pfad_zur_datei = os.path.join(root, datei)
                verarbeite_markdown_datei(pfad_zur_datei, ordnername)

if __name__ == "__main__":
    durchsuche_ordner(wurzelverzeichnis)
