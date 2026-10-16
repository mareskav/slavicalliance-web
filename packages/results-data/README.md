# Výpočty výsledků a identita týmů

## Oprava ligového žebříčku – 16. 10. 2026

Původní výpočet vybíral jeden výsledek pro `(team_name, league_week)` a potom
sčítal podle samotného názvu. Různé stejnojmenné týmy se tím slévaly, například
Vořežpruti z The Pub Praha 2 a Beachklubu Ládví nebo dvě Tiché skupiny.

`src/regular-league-query.ts` rozlišuje profil kombinací **názvu a team_id**.
ID samotné nestačí: zdroj ho sdílí mezi různými názvy. Stejný profil smí hrát
v různých hospodách; samotné seskupení podle podniku by rozbilo například
Slavic Alliance se čtyřmi podniky v jedné sezoně.

Starší výsledek bez ID se přiřadí ke známému profilu pouze tehdy, když stejný
název na přesně stejné URL podniku má v daném období jediné známé ID. Pokud
je profilů více nebo žádný, zůstane samostatná identita podle podniku. Zcela
chybějící podnik se neslučuje s ostatními neznámými událostmi. Nejednoznačná
historická data tím nejsou automaticky zrekonstruována; vyžadují opravu zdroje.

Výběr jednoho výsledku týdně probíhá až uvnitř této identity. Nadále platí
nejnovější běžný kvíz v týdnu, `points - doplnovacek`, vyloučení speciálů,
vyloučení manuálních výsledků a dosavadní filtr členství v regionální lize.
Tato změna neřeší každou odchylku pravidel výběru od oficiálního webu.

Řádky bez známého ID mají odlišné `teamKey` podle identity podniku, takže
nekolidují v tabulce. Počet stejnojmenných týmů se počítá až po jejich rozlišení.
Starší chybné či změněné ID může stále rozdělit jeden skutečný tým; nezahazujeme
identitu pouze podle shody jména, protože by to vrátilo původní chybu.

Ověření nad rozpracovanou lokální DB `quiz-scrapper` k 16. 10.:

| Tým / profil | Body | Kvízů |
|---|---:|---:|
| Vořežpruti / 566 / The Pub Praha 2 | 215,5 | 5 |
| Vořežpruti / 919 / Beachklub Ládví | 55,5 | 2 |
| Tichá skupina / 539 / The Pub Praha 2 | 215,5 | 5 |
| Tichá skupina / 1154 / Český Dvůr | 104,5 | 3 |
| Slavic Alliance / 1306 / více podniků | 219 | 5 |
| Avataři / 966 | 206 | 5 |
| Teraz naozaj vážne / 657 | 205,5 | 5 |

Jde o lokální stav a kontrolované příklady, nikoli certifikaci celé sezony.
Oprava štítků speciálů proběhla v `quiz-scrapper`. Zdrojové odkazy Podrobnosti
speciálních lig mohou vracet běžné kvízy; nemají sloužit jako jediný důkaz.

## Ověření a publikace

```powershell
npm run test:data
npm run typecheck --workspace packages/results-data
```

Pro skutečné PostgreSQL testy nastav `QUIZ_TEST_DATABASE_URL` na lokální
testovací DSN. `regular-league-query.postgres.test.ts` zapisuje pouze do
dočasné tabulky v jedné session; bez proměnné se tyto testy přeskočí.
Pokrývá homonyma, sdílená ID různých názvů, pohyb mezi podniky, chybějící ID,
nejasné párování, doplňováček, více výsledků v týdnu a vyloučení speciálů.

Změna dotazu sama neaktualizuje existující R2 snapshoty. Po bezpečném přenosu
lokálních dat do Neonu je nutné sestavit/publikovat snapshoty s touto verzí
dotazu. Tato oprava byla ověřena lokálně; v rámci práce se nic nepublikovalo.
