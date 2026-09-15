# Admin návod pro kapitána – zadávání historických výsledků

Tento návod popisuje, co kapitán vidí a může dělat po přihlášení do `/admin`
heslem role „captain“ (`CAPTAIN_PASSWORD`). Je psaný pro kapitána týmu, ne
pro vývojáře – technické detaily jsou v
[`docs/plans/captain-manual-quiz-results.md`](plans/captain-manual-quiz-results.md).

## 1. Přihlášení

1. Otevři `https://slavicalliance.cz/admin` (lokálně `http://localhost:3000/admin`).
2. Zadej heslo, které jsi dostal/a (kapitánské heslo, ne admin heslo).
3. Po přihlášení se rovnou zobrazí stránka **Historické výsledky** – kapitán
   nemá přístup k žádné jiné admin sekci (úprava textů webu, nahrávání
   obrázků atd. je jen pro roli admin).

Odhlásíš se tlačítkem **Odhlásit** vpravo nahoře.

## 2. K čemu stránka slouží

Stránka **Historické výsledky** slouží k tomu, aby šlo ručně dopsat výsledek
kvízu, který systém sám nestihl/nemohl načíst automaticky (např. starší
kvízy, kvízy mimo běžný scraping). Zadává se **vždy jeden výsledek jednoho
týmu k jednomu datu**.

Důležité omezení, které stránka sama připomíná v žlutém banneru:

> Ručně zadaný výsledek se hned zobrazí na stránce Slavic Alliance (či
> zvoleného týmu) s ostatními výsledky. Do žebříčků lig (Praha finále,
> dlouhodobé i speciální ligy) se ale ZATÍM nezapočítává – historicky zatím
> neumíme dopočítat, do které ligy a kola by patřil, proto je vidět jen u
> konkrétního týmu.

Jinými slovy: ručně přidaný výsledek uvidíš na stránce daného týmu ve
`/vysledky`, ale **nepromítne se** do žebříčku dlouhodobé ligy ani do
speciálních/finálových žebříčků (Praha finále apod.). To je záměrné chování
současné verze.

## 3. Přidání nového výsledku

V horní části stránky je formulář **Nový výsledek**:

| Pole | Popis |
|---|---|
| **Název týmu** * | Vyber existující tým ze seznamu, nebo zvol „Jiný tým (nový název)…“ a napiš nový název ručně. |
| **Datum kvízu** * | Datum, kdy se kvíz konal. |
| **Body** | Celkový počet bodů týmu (povoleny i půlbody, např. 42.5). |
| **Doplňovačky** | Počet správných doplňovaček (celé číslo). |
| **Hospoda** | Název hospody – našeptává se z dřívějších zadání, ale jde napsat i cokoliv jiného. |
| **Poznámka** | Volný text, např. odkaz na zdroj informace nebo vysvětlení. |

Body a doplňovačky nejsou povinné – lze zadat jen tým, datum a hospodu, pokud
přesná čísla nemáš.

Po vyplnění klikni na **Přidat výsledek**. Nový řádek se objeví v seznamu
níže (řazeno od nejnovějšího zadání).

## 4. Úprava a mazání

- **Upravit** – otevře řádek k editaci přímo v tabulce/kartě. Změny ulož
  tlačítkem **Uložit**, nebo zahoď tlačítkem **Zpět**.
  - Pokud máš rozpracovanou úpravu jednoho řádku a klikneš na „Upravit“ u
    jiného, systém se zeptá, jestli chceš rozpracovanou změnu zahodit.
- **Vymazat** – smaže (zruší) výsledek. Vždy se zeptá na potvrzení
  („Opravdu chceš smazat výsledek týmu…“) – tuto akci nejde v administraci
  vzít zpět, jakmile ji jednou potvrdíš.

## 5. Časté situace

- **Tým v seznamu nenajdu.** Zvol „Jiný tým (nový název)…“ a napiš název
  přesně tak, jak má být zobrazený (velikost písmen, diakritika) – nový tým
  se tím nezaloží nikam jinam, jen se použije jako název u tohoto výsledku.
- **Nevím přesné skóre.** Zadej alespoň tým, datum a hospodu; body/doplňovačky
  nech prázdné.
- **Udělal/a jsem překlep.** Použij „Upravit“ u daného řádku, oprav pole a
  ulož – není potřeba mazat a zadávat znovu.
- **Výsledek se nezobrazuje v žebříčku speciální/dlouhodobé ligy.** To je
  očekávané chování, viz bod 2 výše – ruční výsledky se zatím do těchto
  žebříčků nepočítají, zobrazí se jen u konkrétního týmu.

## 6. Co stránka (zatím) neumí

Aby bylo jasné, co není chyba, ale zatím nezavedená funkce:

- Nejde vrátit smazaný (zrušený) výsledek zpět přes administraci.
- Nejde vidět, kdo a kdy výsledek naposledy upravil.
- Nejde hromadně upravovat nebo importovat více výsledků najednou.
- Nejde vyhledávat/filtrovat v seznamu – zatím se prochází celý seznam.

Stránka je záměrně jednoduchá – jejím jediným účelem je dát kapitánovi
možnost doplnit chybějící historický výsledek jednoho týmu, ne nahradit
administraci celého systému výsledků.
