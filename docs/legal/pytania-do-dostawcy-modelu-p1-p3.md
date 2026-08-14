# Pytania do dostawcy modelu językowego — P-1…P-3 (tor (a) warunku W-4)

**Wersja:** v0.1 · 2026-08-14 · **Autor:** Ryan (CRCO nordsignal) · **Wykonawca:** Darek (CEO,
posiadacz konta u dostawcy) · **Odbiór:** Ryan

> **Ten dokument NIE BLOKUJE wpuszczenia uczestników.** Decyzją Darka z 2026-08-14 warunek **W-4**
> klauzuli art. 13 domknięto wariantem **(b)** — świadome przyjęcie ryzyka, sekcja 11 klauzuli
> zostaje w brzmieniu „ustalamy to". Zapis przyjęcia ryzyka:
> `docs/legal/klauzula-informacyjna-art13.md`, sekcja Z-2b. Tor (a) — ten dokument — idzie
> **równolegle**. Termin: **przed drugą grupą uczestników**.

---

## 1. Po co to jest — jednym akapitem

Art. 13 ust. 1 lit. f RODO wymaga, żeby klauzula informacyjna podała **podstawę prawną przekazania
danych poza Europejski Obszar Gospodarczy** oraz sposób uzyskania kopii zabezpieczeń. Treść, którą
uczestnik pisze do Pomocnika kariery i w obronie ustnej, trafia do dostawcy modelu przetwarzającego
dane poza Europą. **Dziś nie potrafimy tej podstawy wskazać.** Sekcja 11 klauzuli mówi o tym
uczestnikowi wprost — to jest uczciwe, ale **nie jest zgodne**; zgodne będzie dopiero wtedy, gdy
w miejsce przyznania się do luki wejdzie konkretna odpowiedź. Te odpowiedzi zdejmują też pozycję
**L-b** z listy pytań do prawnika i domykają część pozycji **L-c** (umowy powierzenia).

**Czego ten dokument NIE zastępuje:** oceny prawnej. Ja formułuję pytania i odbieram odpowiedzi;
**czy odpowiedź wystarcza**, rozstrzyga prawnik (pozycja L-b w sekcji Z-5 klauzuli). Nie jestem
radcą prawnym i nie udaję, że jestem.

---

## 2. Trzy pytania

Kolejność od najcięższego. **P-3 jest najważniejsze** — jego odpowiedź zmienia treść pokazywaną
uczestnikowi niezależnie od tego, jak wypadną P-1 i P-2.

### P-1 — Czy mamy zawartą umowę powierzenia przetwarzania (art. 28 ust. 3 RODO)?

**Co ustalamy:** czy dostawca występuje wobec nas jako **podmiot przetwarzający** i czy wiąże nas
z nim umowa spełniająca art. 28 ust. 3 — w szczególności: przetwarzanie **wyłącznie na nasze
udokumentowane polecenie**, obowiązek poufności, obowiązek pomocy przy realizacji praw osoby,
zasady korzystania z dalszych podmiotów przetwarzających i obowiązek usunięcia lub zwrotu danych
po zakończeniu świadczenia.

**Gdzie szukać, zanim się zapyta:** warunki komercyjne konta u dostawcy zwykle zawierają dodatek
o przetwarzaniu danych (*data processing addendum*), który wchodzi w życie automatycznie albo po
akceptacji w panelu. **To jest pierwsza rzecz do sprawdzenia — być może odpowiedź już mamy i nikt
jej nie odczytał.**

**Co zapisujemy z odpowiedzi:** nazwę i datę dokumentu, sposób jego zawarcia, oraz **czy obejmuje
konto, z którego realnie korzysta produkcja** (nie inne konto tej samej osoby).

**Czego NIE wolno zrobić:** wpisać do klauzuli „zawarliśmy umowę powierzenia", jeśli nikt nie
wskaże dokumentu. To jest dokładnie ta klasa zdania, którą sekcja Z-4 klauzuli świadomie odrzuca.

---

### P-2 — Na jakiej podstawie odbywa się przekazanie poza EOG?

**Co ustalamy:** który mechanizm z rozdziału V RODO ma zastosowanie — **decyzja o odpowiednim
stopniu ochrony** (np. ramy ochrony danych UE–USA i czy dostawca jest na liście uczestników),
**standardowe klauzule umowne** (który moduł, w której wersji, w jakim dokumencie), czy inny
mechanizm. Jeśli standardowe klauzule umowne — czy przeprowadzono **ocenę skutków transferu**
i czy jest nam udostępniana.

**Co zapisujemy z odpowiedzi:** nazwę mechanizmu, dokument, w którym jest zawarty, datę, oraz
**kraj lub kraje faktycznego przetwarzania**. Klauzula musi umieć powiedzieć uczestnikowi, dokąd
jadą jego dane — nie tylko „poza Europę".

**Pytanie dodatkowe, które zwykle się pomija:** czy dostawca korzysta z **dalszych podmiotów
przetwarzających** (podwykonawców) przy obsłudze naszych żądań i gdzie oni są. Rejestr
sub-procesorów u nas **nie istnieje** (pozycja L-c) — to jest wejście do jego zbudowania.

---

### P-3 — Czy przekazana treść służy do trenowania modeli, i jak długo jest przechowywana?

**Co ustalamy — trzy rzeczy naraz, bo tylko razem dają odpowiedź:**
1. czy treść wysyłana przez interfejs programowy jest **wykorzystywana do trenowania lub
   ulepszania modeli** — domyślnie, po zgodzie, czy nigdy;
2. **jak długo** dostawca przechowuje przekazaną treść i odpowiedzi (okres, licząc od czego);
3. czy istnieje **przegląd przez człowieka** (np. na potrzeby bezpieczeństwa lub nadużyć), kto go
   wykonuje i czy da się go wyłączyć.

**Dlaczego to najważniejsze pytanie.** Odpowiedź „tak, trenujemy" albo „przechowujemy N dni"
**trzeba powiedzieć uczestnikowi wprost w sekcji 5 i 11 klauzuli** — niezależnie od tego, czy
podstawa transferu z P-2 jest w porządku. To jest informacja o **celu** przetwarzania u odbiorcy,
a nie o legalności przekazania. Uczestnik, który pisze do Pomocnika kariery o swoich lukach
kompetencyjnych, ma prawo wiedzieć, czy ta treść zasili cudzy model.

**Co zapisujemy z odpowiedzi:** stan domyślny dla naszego typu konta, **nazwę ustawienia**, jeśli
da się to zmienić, oraz okres przechowywania. Jeśli okres jest różny dla różnych funkcji —
rozpisujemy per funkcja.

---

## 3. Co robimy z odpowiedziami

| Odpowiedź | Co się zmienia |
|---|---|
| **P-1 + P-2 pełne** | Sekcja 11 klauzuli **znika w obecnej formie** i zostaje zastąpiona konkretną podstawą; pozycja **L-b** zdjęta z listy pytań do prawnika; wiersz W-4 tabeli Z-2 domknięty torem (a), a nie przyjęciem ryzyka |
| **P-3: „nie trenujemy, przechowujemy N dni"** | Zdanie o tym wchodzi do **sekcji 5** klauzuli (odbiorcy) — to informacja korzystna dla uczestnika i nie ma powodu jej chować |
| **P-3: „trenujemy" albo brak jasności** | Zdanie o tym wchodzi do **sekcji 5 i 11** wprost. Osobno: rozstrzygnięcie produktowe Sophii, czy funkcje oparte na modelu zostają domyślnie włączone. **To przestaje być decyzja o zgodności, a staje się decyzją o produkcie** |
| **Dostawca nie odpowiada w terminie** | Nie zmyślamy podstawy. Sekcja 11 zostaje, a **przed drugą grupą** wraca decyzja Darka: czekać dalej, czy zawęzić funkcje oparte na modelu. Milczenie dostawcy nie jest odpowiedzią i nie wolno go tak zapisać |

**Każda odpowiedź trafia tutaj z datą i źródłem** (dokument, adres strony, wiadomość) — nie do
czatu i nie do niczyjej pamięci. Powód: `docs/legal/klauzula-informacyjna-art13.md`, sekcja Z-2a,
wniosek metodyczny o dowodzie, którego nie da się odtworzyć.

---

## 4. Odpowiedzi — dziennik

*(pusty na 2026-08-14 — nic jeszcze nie zapytano)*

| Data | Pytanie | Odpowiedź | Źródło | Kto odebrał |
|---|---|---|---|---|
| — | — | — | — | — |
