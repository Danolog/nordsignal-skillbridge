# SkillBridge: żywy sygnał rynku pracy — co zyskuje student i uczelnia

> Opis funkcji z bloku „Żywy sygnał rynku" (wewnętrznie: Blok AG), napisany od
> strony użytkownika — dla pracowników naukowych i decydentów uczelni.
> Stan: wszystkie funkcje ukończone i przetestowane (lipiec 2026).

---

## W jednym zdaniu

SkillBridge przestał być aplikacją, która raz pokazała studentowi jego braki —
a stał się systemem, który **na bieżąco obserwuje rynek pracy i mówi studentowi,
kiedy świat się zmienił**, zanim dowie się o tym na rozmowie kwalifikacyjnej.

---

## Co zyskuje student

### 1. Braki kompetencji liczone z prawdziwych ogłoszeń o pracę — nie z ankiety

Większość aplikacji edukacyjnych pyta studenta, czego chciałby się nauczyć,
albo opiera się na katalogu kompetencji ułożonym raz, przy starcie produktu.
SkillBridge robi to inaczej: lista braków („luk") studenta powstaje przez
porównanie jego umiejętności z **rzeczywistymi wymaganiami z tysięcy aktualnych
ogłoszeń o pracę** dla wybranego przez niego zawodu. Jeśli 55% ogłoszeń dla
analityka danych wymaga danej technologii, a student jej nie zna — widzi to
czarno na białym, razem z wagą (luka krytyczna / ważna) i odsetkiem ofert.

**Dlaczego to ważne:** student nie planuje rozwoju na podstawie intuicji swojej
ani naszej — tylko na podstawie tego, za co pracodawcy naprawdę płacą dzisiaj.

### 2. Dane rynku odświeżane co miesiąc — profil studenta nigdy się nie starzeje

Rynek IT zmienia się szybko: technologia, która rok temu była ciekawostką, dziś
bywa wymogiem. Co miesiąc SkillBridge wczytuje świeży zrzut ogłoszeń o pracę,
a po jego zatwierdzeniu **profil każdego studenta jest automatycznie przeliczany
od nowa** — bez żadnego działania ze strony studenta. Mapa kompetencji, lista
braków i paszport kompetencji zawsze odzwierciedlają aktualny rynek.

**Dlaczego to ważne:** typowe platformy e-learningowe prowadzą studenta po
ścieżce ułożonej raz. U nas ścieżka podąża za rynkiem.

### 3. Powiadomienie „rynek zaczął wymagać X" — za zgodą studenta

Gdy comiesięczne odświeżenie wykryje, że w zawodzie studenta pojawiło się nowe
wymaganie, którego student nie ma, na jego pulpicie pojawia się powiadomienie:
*„Rynek zaczął wymagać: X — luka krytyczna, 55% ofert"* z przejściem wprost do
projektów, które tę lukę zamykają.

Powiadomienia działają wyłącznie **za wyraźną zgodą studenta** (zgodnie z RODO):
student sam włącza monitorowanie rynku względem swojego profilu i może tę zgodę
w każdej chwili wycofać — jednym kliknięciem, bez szukania w ustawieniach.

**Dlaczego to ważne:** student nie musi śledzić trendów branżowych — system robi
to za niego i odzywa się tylko wtedy, gdy naprawdę jest o czym mówić.

### 4. Doradca AI, który pamięta studenta między rozmowami

Doradca kariery w SkillBridge nie zaczyna każdej rozmowy od zera. Pamięta
z poprzednich sesji: jakie projekty student ukończył, co go interesuje, jak
zmieniały się jego braki. Druga rozmowa zaczyna się tam, gdzie skończyła się
pierwsza — jak u dobrego opiekuna roku, nie jak na infolinii.

**Dlaczego to ważne:** większość czatów AI w produktach edukacyjnych to
jednorazowe rozmowy. Nasz doradca prowadzi studenta w czasie.

### 5. Opisy „dlaczego to ważne" przy każdej luce

Każdy wykryty brak ma krótkie, konkretne wyjaśnienie, po co ta kompetencja jest
studentowi potrzebna w jego zawodzie. Opisy generuje AI — ale raz napisany opis
jest zapamiętywany, a przy comiesięcznym odświeżeniu opisy istniejących luk są
przenoszone, nie tworzone od nowa. Nowe opisy powstają tylko dla naprawdę
nowych wymagań.

---

## Co zyskuje uczelnia i jej decydenci

### 6. AI pod stałą, mierzalną kontrolą jakości — nie czarna skrzynka

Zanim jakakolwiek zmiana w mechanizmie wykrywania braków trafi do studentów,
przechodzi przez **stały zestaw wzorcowych przypadków testowych** z ręcznie
zweryfikowanymi poprawnymi odpowiedziami. Każda modyfikacja musi pokazać
liczbowo, czy poprawia, czy psuje trafność — i jest to udokumentowane. Jakość
opisów ocenia dodatkowo niezależny mechanizm oceniający, według jawnych
kryteriów.

**Dlaczego to ważne dla uczelni:** na pytanie „skąd wiecie, że wasze AI działa
dobrze?" odpowiadamy pomiarem, nie zapewnieniem. To rzadkość w edtechu.

### 7. Podwójne zabezpieczenie przed „zmyślaniem" AI

Tam, gdzie AI proponuje nazwy kompetencji, działa **drugi, niezależny mechanizm
weryfikujący**: każda propozycja musi mieć pokrycie w danych rynkowych, inaczej
jest odrzucana, zanim student ją zobaczy. W testach mechanizm ten poprawnie
odrzucił celowo podstawioną, zmyśloną kompetencję. A sama lista braków studenta
w ogóle nie zależy od „opinii" modelu AI — jest wyliczana wprost z danych,
w sposób powtarzalny: te same dane zawsze dają ten sam wynik.

**Dlaczego to ważne:** halucynacje AI to główny zarzut wobec narzędzi tej
klasy. U nas AI pisze wyjaśnienia i doradza — ale o tym, co jest brakiem,
decydują dane.

### 8. Człowiek ma ostatnie słowo nad danymi

Comiesięczna aktualizacja danych rynkowych **nigdy nie trafia do studentów
automatycznie**. Nowe dane lądują najpierw w poczekalni, system pokazuje
czytelne porównanie („co się zmieni"), a operator zatwierdza je świadomie —
jednym przyciskiem, także z telefonu. Przed każdą podmianą powstaje
automatyczna kopia zapasowa, a procedura powrotu do poprzednich danych jest
opisana i przetestowana.

**Dlaczego to ważne:** decydent uczelni może powiedzieć studentom i rodzicom,
że dane, na których opiera się ich rozwój, przechodzą przez kontrolę człowieka.

### 9. Prywatność zgodna z RODO — wbudowana, nie dolepiona

Monitorowanie rynku względem profilu studenta wymaga jego wyraźnej,
odwoływalnej zgody. Panel wykładowcy pokazuje wyłącznie dane zbiorcze
i anonimowe — nigdy nazwisk ani adresów. Dodatkowo dostęp do danych jest
egzekwowany na poziomie samej bazy danych: student technicznie nie jest
w stanie zobaczyć danych innego studenta, nawet gdyby w aplikacji pojawił się
błąd.

### 10. Koszty pod kontrolą — rozwiązanie skalowalne ekonomicznie

System używa AI oszczędnie i tylko tam, gdzie wnosi wartość. Comiesięczne
przeliczenie profili wszystkich studentów odbywa się **niemal bez udziału
płatnych modeli AI** — matematyka zamiast zapytań do modelu. AI generuje
wyłącznie opisy naprawdę nowych wymagań, przy czym jeden opis obsługuje
wszystkich studentów z tym samym brakiem. Każde wywołanie AI jest księgowane,
więc koszt na studenta jest znany, a nie szacowany.

**Dlaczego to ważne dla decydenta:** wiele produktów AI ma model kosztowy,
który rośnie liniowo z liczbą użytkowników i zapytań. Nasz rośnie z liczbą
*zmian na rynku* — czyli wolno i przewidywalnie.

---

## Czym SkillBridge różni się od typowych aplikacji edtech

| Typowa aplikacja edtech | SkillBridge |
|---|---|
| Katalog kursów ułożony raz, aktualizowany „od święta" | Wymagania z żywych ogłoszeń o pracę, odświeżane co miesiąc |
| Braki z samooceny lub ankiety | Braki wyliczone z porównania umiejętności z rynkiem |
| „Zaufaj naszemu AI" | Jakość AI mierzona na wzorcowych przypadkach, wynik udokumentowany |
| AI może zmyślić kompetencję | Każda propozycja AI weryfikowana względem danych rynkowych |
| Aktualizacje danych „dzieją się same" | Człowiek zatwierdza każdą zmianę danych, z kopią zapasową |
| Czat AI bez pamięci | Doradca pamiętający historię studenta |
| Zgody RODO w regulaminie | Wyraźna zgoda w produkcie, wycofywalna jednym kliknięciem |
| Koszt AI rośnie z każdym użytkownikiem | Koszt rośnie ze zmianami rynku — wolno i przewidywalnie |

---

## Słowniczek (do użytku zespołu)

| Nazwa w tym dokumencie | Zadanie |
|---|---|
| Kontrola jakości AI (pkt 6) | AG.0 — harness ewaluacyjny |
| Weryfikacja propozycji AI (pkt 7) | AG.1 — weryfikator luk; AG.2 — braki liczone z danych |
| Miesięczne odświeżenie rynku (pkt 2, 8) | AG.3 — upload i poczekalnia; AG.4 — zatwierdzenie i podmiana |
| Automatyczne przeliczenie profili (pkt 2, 5, 10) | AG.5 — recompute |
| Powiadomienie „nowa luka" (pkt 3, 9) | AG.6 — powiadomienia in-app + zgoda RODO |
| Doradca z pamięcią (pkt 4) | AG.7 — pamięć doradcy |
