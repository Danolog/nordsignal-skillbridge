export type DemoProject = {
	slug: string;
	title: string;
	description: string;
	level: "L1" | "L2" | "L3";
	estimatedHours: number;
	sourceType: "open_data" | "oss";
	sourceUrl: string;
	rubricJson: Array<{ criterion: string; weight: number; description: string }>;
	competencies: Array<{ name: string; role: "required" | "acquired" }>;
};

export const DEMO_PROJECTS: DemoProject[] = [
	// ── Data Analyst (7 projects: 3 L1, 3 L2, 1 L3) ──
	{
		slug: "analiza-wynagrodzen-gus",
		title: "Analiza wynagrodzeń w Polsce na podstawie danych GUS",
		description:
			"Pobierz dane z Banku Danych Lokalnych GUS o wynagrodzeniach w różnych branżach. Przygotuj analizę trendów i wizualizację.",
		level: "L1",
		estimatedHours: 3,
		sourceType: "open_data",
		sourceUrl: "https://bdl.stat.gov.pl/bdl/dane/podgrup/temat",
		rubricJson: [
			{
				criterion: "Poprawne pobranie i wczytanie danych",
				weight: 30,
				description: "Dane pobrane z BDL, wczytane do DataFrame",
			},
			{
				criterion: "Analiza eksploracyjna",
				weight: 40,
				description: "Minimum 3 wykresy z opisami",
			},
			{ criterion: "Wnioski", weight: 30, description: "Minimum 5 wniosków z analizy" },
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "Pandas", role: "required" },
			{ name: "Statystyka", role: "acquired" },
		],
	},
	{
		slug: "demografia-powiatow",
		title: "Mapa demograficzna powiatów Polski",
		description:
			"Wykorzystaj dane demograficzne z GUS do stworzenia interaktywnej mapy pokazującej zmiany populacji w powiatach.",
		level: "L1",
		estimatedHours: 4,
		sourceType: "open_data",
		sourceUrl: "https://bdl.stat.gov.pl/bdl/dane/podgrup/temat",
		rubricJson: [
			{
				criterion: "Poprawne przetworzenie danych",
				weight: 30,
				description: "Dane demograficzne poprawnie wczytane",
			},
			{ criterion: "Wizualizacja", weight: 40, description: "Mapa z podziałem na powiaty" },
			{
				criterion: "Analiza trendów",
				weight: 30,
				description: "Komentarz do zmian demograficznych",
			},
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "Pandas", role: "required" },
		],
	},
	{
		slug: "analiza-jakosci-powietrza",
		title: "Analiza jakości powietrza w polskich miastach",
		description:
			"Pobierz dane z portalu dane.gov.pl o jakości powietrza. Przeanalizuj trendy PM2.5 i PM10 w wybranych miastach.",
		level: "L1",
		estimatedHours: 5,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/4,dane-pomiarowe-gios",
		rubricJson: [
			{ criterion: "Pobranie danych API", weight: 25, description: "Dane pobrane z API GIOŚ" },
			{
				criterion: "Czyszczenie danych",
				weight: 25,
				description: "Obsługa braków, konwersja typów",
			},
			{
				criterion: "Wizualizacja trendów",
				weight: 30,
				description: "Wykresy porównawcze między miastami",
			},
			{ criterion: "Wnioski", weight: 20, description: "Interpretacja wyników" },
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "Pandas", role: "required" },
			{ name: "Statystyka", role: "acquired" },
		],
	},
	{
		slug: "dashboard-edukacja-gus",
		title: "Dashboard edukacyjny z danych GUS",
		description:
			"Stwórz interaktywny dashboard w Tableau/Power BI prezentujący dane o szkolnictwie wyższym w Polsce — liczba studentów, kierunki, trendy.",
		level: "L2",
		estimatedHours: 10,
		sourceType: "open_data",
		sourceUrl: "https://bdl.stat.gov.pl/bdl/dane/podgrup/temat",
		rubricJson: [
			{ criterion: "Źródło danych", weight: 20, description: "Dane z BDL poprawnie zaimportowane" },
			{ criterion: "Dashboard", weight: 40, description: "Minimum 4 interaktywne widgety" },
			{
				criterion: "Filtry",
				weight: 20,
				description: "Filtry po roku, województwie, typie uczelni",
			},
			{ criterion: "Storytelling", weight: 20, description: "Spójna narracja danych" },
		],
		competencies: [
			{ name: "Tableau/Power BI", role: "acquired" },
			{ name: "SQL", role: "required" },
			{ name: "Komunikacja wyników", role: "acquired" },
		],
	},
	{
		slug: "predykcja-cen-mieszkan",
		title: "Model predykcji cen mieszkań na podstawie danych otwartych",
		description:
			"Wykorzystaj dane o transakcjach nieruchomości z rejestru cen i zbuduj prosty model regresji przewidujący ceny mieszkań.",
		level: "L2",
		estimatedHours: 12,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/1887,rejestr-cen-nieruchomosci",
		rubricJson: [
			{
				criterion: "Przygotowanie danych",
				weight: 25,
				description: "Feature engineering, czyszczenie danych",
			},
			{ criterion: "Model ML", weight: 35, description: "Regresja z walidacją krzyżową" },
			{ criterion: "Ewaluacja", weight: 20, description: "Metryki: RMSE, MAE, R²" },
			{ criterion: "Dokumentacja", weight: 20, description: "Notebook z opisami kroków" },
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "Machine Learning (podstawy)", role: "acquired" },
			{ name: "Pandas", role: "required" },
			{ name: "Statystyka", role: "required" },
		],
	},
	{
		slug: "analiza-budzetow-gmin",
		title: "Analiza budżetów gmin w Polsce",
		description:
			"Pobierz dane o budżetach gmin z portalu dane.gov.pl. Przeanalizuj strukturę wydatków i przychodów, porównaj gminy wiejskie i miejskie.",
		level: "L2",
		estimatedHours: 8,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/844,dane-z-budzetow-gmin",
		rubricJson: [
			{
				criterion: "Pobranie i przetworzenie danych",
				weight: 25,
				description: "Dane budżetowe poprawnie wczytane",
			},
			{
				criterion: "Analiza porównawcza",
				weight: 35,
				description: "Porównanie min. 3 kategorii gmin",
			},
			{ criterion: "Wizualizacja", weight: 25, description: "Minimum 5 wykresów" },
			{ criterion: "Raport", weight: 15, description: "Podsumowanie w formie raportu" },
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "Pandas", role: "required" },
			{ name: "Komunikacja wyników", role: "acquired" },
		],
	},
	{
		slug: "pipeline-etl-transport",
		title: "Pipeline ETL dla danych transportowych",
		description:
			"Zaprojektuj i zaimplementuj pipeline ETL pobierający dane z API transportu publicznego, transformujący je i ładujący do bazy danych z dashboardem.",
		level: "L3",
		estimatedHours: 20,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/1739,rozklady-jazdy-gtfs",
		rubricJson: [
			{ criterion: "Architektura ETL", weight: 20, description: "Dokumentacja pipeline'u" },
			{ criterion: "Ekstrakcja", weight: 20, description: "Pobranie danych z API GTFS" },
			{
				criterion: "Transformacja",
				weight: 25,
				description: "Czyszczenie, normalizacja, agregacja",
			},
			{ criterion: "Ładowanie i dashboard", weight: 20, description: "Baza danych + wizualizacja" },
			{ criterion: "Automatyzacja", weight: 15, description: "Skrypt uruchamiany cyklicznie" },
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "SQL", role: "required" },
			{ name: "Pandas", role: "required" },
			{ name: "Git/GitHub", role: "required" },
			{ name: "Tableau/Power BI", role: "acquired" },
		],
	},
	// ── Frontend Developer (7 projects: 3 L1, 2 L2, 2 L3) ──
	{
		slug: "portfolio-responsywne",
		title: "Responsywna strona portfolio",
		description:
			"Stwórz responsywną stronę portfolio z użyciem HTML, CSS i JavaScript. Strona powinna działać poprawnie na urządzeniach mobilnych.",
		level: "L1",
		estimatedHours: 4,
		sourceType: "oss",
		sourceUrl: "https://github.com/bradtraversy/50projects50days",
		rubricJson: [
			{
				criterion: "Responsywność",
				weight: 35,
				description: "Poprawne wyświetlanie na mobile i desktop",
			},
			{ criterion: "Semantyczny HTML", weight: 25, description: "Użycie semantic HTML5 tags" },
			{ criterion: "Styl CSS", weight: 25, description: "Spójny design, flexbox/grid" },
			{
				criterion: "Interaktywność",
				weight: 15,
				description: "Minimum 2 interaktywne elementy JS",
			},
		],
		competencies: [
			{ name: "HTML/CSS", role: "required" },
			{ name: "JavaScript", role: "required" },
			{ name: "Responsive Design", role: "acquired" },
		],
	},
	{
		slug: "kalkulator-react",
		title: "Kalkulator naukowy w React",
		description:
			"Zbuduj kalkulator naukowy jako aplikację React z komponentami, stanem i testami jednostkowymi.",
		level: "L1",
		estimatedHours: 6,
		sourceType: "oss",
		sourceUrl: "https://github.com/facebook/react",
		rubricJson: [
			{ criterion: "Funkcjonalność", weight: 30, description: "Operacje arytmetyczne + naukowe" },
			{
				criterion: "Architektura React",
				weight: 30,
				description: "Podział na komponenty, zarządzanie stanem",
			},
			{ criterion: "Testy", weight: 25, description: "Minimum 5 testów jednostkowych" },
			{ criterion: "UI/UX", weight: 15, description: "Czytelny interfejs, obsługa klawiatury" },
		],
		competencies: [
			{ name: "React", role: "required" },
			{ name: "JavaScript", role: "required" },
			{ name: "Testowanie (Jest/Vitest)", role: "acquired" },
		],
	},
	{
		slug: "wizualizacja-danych-otwartych",
		title: "Wizualizacja danych otwartych z API",
		description:
			"Stwórz aplikację frontendową pobierającą dane z publicznego API i prezentującą je w formie interaktywnych wykresów.",
		level: "L1",
		estimatedHours: 5,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/2569,punkty-adresowe-z-gminy",
		rubricJson: [
			{ criterion: "Fetch API", weight: 30, description: "Poprawne pobieranie danych z REST API" },
			{ criterion: "Wizualizacja", weight: 35, description: "Minimum 2 typy wykresów" },
			{ criterion: "Responsywność", weight: 20, description: "Działa na mobile" },
			{ criterion: "Error handling", weight: 15, description: "Obsługa błędów sieciowych" },
		],
		competencies: [
			{ name: "JavaScript", role: "required" },
			{ name: "REST API", role: "acquired" },
			{ name: "HTML/CSS", role: "required" },
		],
	},
	{
		slug: "dashboard-typescript-react",
		title: "Dashboard analityczny w React + TypeScript",
		description:
			"Zbuduj dashboard z filtrami, wykresami i tabelą danych używając React, TypeScript i biblioteki wykresów. Dane z pliku JSON lub API.",
		level: "L2",
		estimatedHours: 15,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/1452,statystyki-odwiedzin-serwisow",
		rubricJson: [
			{ criterion: "TypeScript", weight: 25, description: "Pełne typowanie, brak any" },
			{ criterion: "Komponenty", weight: 25, description: "Reużywalne, dobrze podzielone" },
			{ criterion: "Wykresy", weight: 25, description: "Minimum 3 typy wykresów" },
			{ criterion: "Filtry i stan", weight: 25, description: "Filtrowanie danych, URL state" },
		],
		competencies: [
			{ name: "React", role: "required" },
			{ name: "TypeScript", role: "required" },
			{ name: "REST API", role: "required" },
			{ name: "Responsive Design", role: "acquired" },
		],
	},
	{
		slug: "kontrybutor-oss-react",
		title: "Kontrybutor OSS: poprawa dokumentacji React",
		description:
			"Znajdź issue oznaczony 'good first issue' w repozytorium React lub powiązanym projekcie OSS. Napraw bug lub ulepsz dokumentację.",
		level: "L2",
		estimatedHours: 10,
		sourceType: "oss",
		sourceUrl:
			"https://github.com/facebook/react/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
		rubricJson: [
			{ criterion: "Wybór issue", weight: 20, description: "Issue z labelem 'good first issue'" },
			{ criterion: "Rozwiązanie", weight: 40, description: "Poprawne rozwiązanie problemu" },
			{ criterion: "Pull Request", weight: 25, description: "PR zgodny z contributing guidelines" },
			{ criterion: "Dokumentacja", weight: 15, description: "Opis zmian w PR" },
		],
		competencies: [
			{ name: "Git", role: "required" },
			{ name: "React", role: "required" },
			{ name: "TypeScript", role: "required" },
		],
	},
	{
		slug: "komponent-design-system",
		title: "Biblioteka komponentów UI z Design System",
		description:
			"Zaprojektuj i zaimplementuj bibliotekę 10+ reużywalnych komponentów React z dokumentacją w Storybook i pełnym pokryciem testami.",
		level: "L3",
		estimatedHours: 25,
		sourceType: "oss",
		sourceUrl: "https://github.com/shadcn-ui/ui",
		rubricJson: [
			{ criterion: "Komponenty", weight: 25, description: "Minimum 10 komponentów z wariantami" },
			{ criterion: "Design System", weight: 25, description: "Tokeny, spójna paleta, typografia" },
			{ criterion: "Dokumentacja", weight: 25, description: "Storybook z przykładami użycia" },
			{ criterion: "Testy", weight: 15, description: "Testy dla każdego komponentu" },
			{ criterion: "Dostępność", weight: 10, description: "Zgodność z WCAG 2.1 AA" },
		],
		competencies: [
			{ name: "React", role: "required" },
			{ name: "TypeScript", role: "required" },
			{ name: "Figma (podstawy)", role: "required" },
			{ name: "Testowanie (Jest/Vitest)", role: "required" },
			{ name: "Optymalizacja wydajności", role: "acquired" },
		],
	},
	{
		slug: "fullstack-app-nextjs",
		title: "Aplikacja full-stack w Next.js z danymi otwartymi",
		description:
			"Zbuduj kompletną aplikację Next.js z SSR, API routes, bazą danych i autentykacją, wykorzystującą dane otwarte jako źródło.",
		level: "L3",
		estimatedHours: 30,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/1452,statystyki-odwiedzin-serwisow",
		rubricJson: [
			{
				criterion: "Architektura",
				weight: 20,
				description: "App Router, server/client components",
			},
			{ criterion: "Backend", weight: 25, description: "API routes, baza danych, auth" },
			{ criterion: "Frontend", weight: 25, description: "Responsywny UI, formularz, tabele" },
			{ criterion: "Dane otwarte", weight: 15, description: "Integracja z API dane.gov.pl" },
			{ criterion: "Deploy", weight: 15, description: "Działający deploy na Vercel" },
		],
		competencies: [
			{ name: "React", role: "required" },
			{ name: "TypeScript", role: "required" },
			{ name: "REST API", role: "required" },
			{ name: "Git", role: "required" },
			{ name: "Responsive Design", role: "acquired" },
		],
	},
	// ── Backend Developer (6 projects: 2 L1, 3 L2, 1 L3) ──
	{
		slug: "rest-api-crud",
		title: "REST API CRUD z Express i PostgreSQL",
		description:
			"Zbuduj prostą REST API z operacjami CRUD, walidacją danych i obsługą błędów. Użyj Express.js i PostgreSQL.",
		level: "L1",
		estimatedHours: 5,
		sourceType: "oss",
		sourceUrl: "https://github.com/expressjs/express",
		rubricJson: [
			{
				criterion: "Endpointy CRUD",
				weight: 35,
				description: "GET, POST, PUT, DELETE z walidacją",
			},
			{ criterion: "Baza danych", weight: 30, description: "PostgreSQL z migracjami" },
			{ criterion: "Error handling", weight: 20, description: "Spójne odpowiedzi błędów" },
			{ criterion: "Dokumentacja API", weight: 15, description: "README z opisem endpointów" },
		],
		competencies: [
			{ name: "Node.js", role: "required" },
			{ name: "SQL", role: "required" },
			{ name: "REST API", role: "acquired" },
		],
	},
	{
		slug: "skrypt-przetwarzania-danych",
		title: "Skrypt przetwarzania danych otwartych",
		description:
			"Napisz skrypt w Pythonie pobierający dane z API dane.gov.pl, transformujący je i zapisujący do bazy SQLite z logowaniem.",
		level: "L2",
		estimatedHours: 8,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/2569,punkty-adresowe-z-gminy",
		rubricJson: [
			{ criterion: "Pobieranie danych", weight: 30, description: "Fetch z API z obsługą błędów" },
			{ criterion: "Transformacja", weight: 30, description: "Czyszczenie i normalizacja" },
			{ criterion: "Zapis do bazy", weight: 25, description: "SQLite z poprawnym schematem" },
			{ criterion: "Logowanie", weight: 15, description: "Logi operacji i błędów" },
		],
		competencies: [
			{ name: "Python/Java", role: "required" },
			{ name: "SQL", role: "required" },
		],
	},
	{
		slug: "api-z-autentykacja",
		title: "API z autentykacją JWT i rate limiting",
		description:
			"Rozbuduj REST API o autentykację JWT, role użytkowników, rate limiting i middleware bezpieczeństwa.",
		level: "L2",
		estimatedHours: 12,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/1887,rejestr-cen-nieruchomosci",
		rubricJson: [
			{
				criterion: "Autentykacja JWT",
				weight: 30,
				description: "Rejestracja, login, refresh token",
			},
			{ criterion: "Autoryzacja", weight: 25, description: "Role i uprawnienia" },
			{ criterion: "Rate limiting", weight: 20, description: "Ochrona przed nadmiernym ruchem" },
			{ criterion: "Testy", weight: 25, description: "Testy integracyjne endpointów" },
		],
		competencies: [
			{ name: "Node.js", role: "required" },
			{ name: "REST API", role: "required" },
			{ name: "Bezpieczeństwo aplikacji", role: "acquired" },
			{ name: "Git", role: "required" },
		],
	},
	{
		slug: "docker-hello-world",
		title: "Konteneryzacja aplikacji z Docker",
		description:
			"Spakuj prostą aplikację Node.js do kontenera Docker. Napisz Dockerfile, zbuduj obraz i uruchom lokalnie z wolumenem na dane.",
		level: "L1",
		estimatedHours: 3,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/4,dane-pomiarowe-gios",
		rubricJson: [
			{ criterion: "Docker Compose", weight: 30, description: "Poprawna konfiguracja kontenerów" },
			{ criterion: "Przetwarzanie danych", weight: 25, description: "Import danych publicznych" },
			{ criterion: "API", weight: 25, description: "Endpointy do odczytu danych" },
			{ criterion: "Dokumentacja", weight: 20, description: "README z instrukcją uruchomienia" },
		],
		competencies: [
			{ name: "Docker", role: "required" },
			{ name: "Node.js", role: "required" },
		],
	},
	{
		slug: "api-monitoring-dane-publiczne",
		title: "API monitoringu danych publicznych",
		description:
			"Zbuduj serwis monitorujący zmiany w danych publicznych z dane.gov.pl. Cykliczne pobieranie, porównywanie i powiadomienia o zmianach.",
		level: "L2",
		estimatedHours: 14,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/4,dane-pomiarowe-gios",
		rubricJson: [
			{ criterion: "Scheduler", weight: 25, description: "Cykliczne pobieranie danych" },
			{ criterion: "Porównywanie", weight: 25, description: "Wykrywanie zmian w danych" },
			{ criterion: "API", weight: 25, description: "Endpointy do przeglądania historii zmian" },
			{ criterion: "Baza danych", weight: 15, description: "Przechowywanie historii" },
			{ criterion: "Testy", weight: 10, description: "Testy jednostkowe logiki porównywania" },
		],
		competencies: [
			{ name: "Node.js", role: "required" },
			{ name: "REST API", role: "required" },
			{ name: "SQL", role: "required" },
			{ name: "Docker", role: "acquired" },
		],
	},
	{
		slug: "microservices-event-driven",
		title: "Architektura mikroserwisów event-driven",
		description:
			"Zaprojektuj i zaimplementuj system 3 mikroserwisów komunikujących się przez events. Użyj Docker, PostgreSQL i message broker.",
		level: "L3",
		estimatedHours: 35,
		sourceType: "open_data",
		sourceUrl: "https://dane.gov.pl/pl/dataset/1739,rozklady-jazdy-gtfs",
		rubricJson: [
			{ criterion: "Architektura", weight: 20, description: "Diagram i dokumentacja systemu" },
			{ criterion: "Mikroserwisy", weight: 25, description: "3 niezależne serwisy" },
			{ criterion: "Komunikacja", weight: 25, description: "Event-driven z message broker" },
			{ criterion: "Docker", weight: 15, description: "Docker Compose dla całego stacku" },
			{ criterion: "Testy", weight: 15, description: "Testy integracyjne end-to-end" },
		],
		competencies: [
			{ name: "Node.js", role: "required" },
			{ name: "Docker", role: "required" },
			{ name: "Mikrousługi", role: "acquired" },
			{ name: "SQL", role: "required" },
			{ name: "Cloud (AWS/GCP/Azure)", role: "acquired" },
		],
	},
	// ── Data Scientist (10 projects: 4 L1, 4 L2, 2 L3) — partia 1, zastąpiły 7 projektów-klisz ──
	{
		slug: "ds-eda-polska-w-liczbach-bdl",
		title: "Polska w liczbach: eksploracja danych regionalnych z API GUS BDL",
		description:
			"Zbudujesz notebook, który pobiera dane regionalne z API Banku Danych Lokalnych GUS (licencja CC BY 4.0) i przeprowadza rzetelną eksploracyjną analizę danych. Wyczyścisz braki, sprawdzisz typy i wartości odstające, zwizualizujesz trend wybranego wskaźnika w województwach i sformułujesz 2-3 hipotezy wprost z danych. Efektem jest reprodukowalne repozytorium z README i notebookiem opisującym każdą decyzję.",
		level: "L1",
		estimatedHours: 5,
		sourceType: "open_data",
		sourceUrl: "https://api.stat.gov.pl/Home/BdlApi",
		rubricJson: [
			{
				criterion: "Jakość czyszczenia danych i uzasadnienie decyzji",
				weight: 30,
				description:
					"Notebook pokazuje kontrolę typów, świadomą obsługę braków (nie ślepe dropna) oraz identyfikację wartości odstających. Każda decyzja o usunięciu/imputacji jest krótko uzasadniona w komentarzu lub markdownie.",
			},
			{
				criterion: "EDA z wnioskami i hipotezami",
				weight: 30,
				description:
					"Analiza wykracza poza describe(): są pytania badawcze, rozkłady, relacje między zmiennymi oraz 2-3 hipotezy sformułowane wprost z danych, z zaznaczeniem, że wymagają dalszej weryfikacji.",
			},
			{
				criterion: "Wizualizacja trendu regionalnego",
				weight: 20,
				description:
					"Co najmniej jeden czytelny wykres trendu w ujęciu regionalnym: opisane osie, jednostki, tytuł, legenda. Wykres wspiera wniosek, a nie jest ozdobą.",
			},
			{
				criterion: "Reprodukowalność repozytorium",
				weight: 20,
				description:
					"Repo zawiera README z opisem uruchomienia, requirements.txt, ustawiony seed tam gdzie istnieje losowość oraz sensowną historię commitów w Git. Notebook uruchamia się od góry do dołu bez błędów.",
			},
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "Pandas", role: "required" },
			{ name: "NumPy", role: "required" },
			{ name: "EDA", role: "required" },
			{ name: "SQL", role: "acquired" },
			{ name: "Git", role: "acquired" },
		],
	},
	{
		slug: "ds-sql-analiza-przejazdow",
		title: "SQL w praktyce: analiza przejazdów taksówek NYC z funkcjami okna",
		description:
			"Przeanalizujesz próbkę zbioru NYC TLC Trip Records przy użyciu czystego SQL, uruchamianego lokalnie w DuckDB lub SQLite. Napiszesz zapytania z JOIN-ami, agregacjami i funkcjami okna, a następnie zoptymalizujesz najcięższe z nich. Efektem jest repozytorium z plikami .sql, skryptem ładującym próbkę oraz krótkim raportem wyników z wnioskami biznesowymi.",
		level: "L1",
		estimatedHours: 4,
		sourceType: "open_data",
		sourceUrl: "https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page",
		rubricJson: [
			{
				criterion: "Poprawność i czytelność zapytań",
				weight: 30,
				description:
					"Zapytania zwracają poprawne wyniki, są sformatowane czytelnie (wcięcia, aliasy, komentarze) i używają JOIN-ów oraz agregacji zgodnie z ziarnem danych. Brak niejawnych iloczynów kartezjańskich.",
			},
			{
				criterion: "Użycie funkcji okna",
				weight: 30,
				description:
					"Co najmniej dwa zapytania stosują window functions (np. ROW_NUMBER, RANK, SUM OVER, LAG/LEAD) tam, gdzie GROUP BY byłoby niewystarczające, z krótkim uzasadnieniem wyboru.",
			},
			{
				criterion: "Wnioski z danych",
				weight: 20,
				description:
					"Raport przekłada wyniki zapytań na 2-3 konkretne obserwacje o przejazdach (np. wzorce czasowe, różnice między strefami), a nie tylko wkleja tabele.",
			},
			{
				criterion: "Reprodukowalność",
				weight: 20,
				description:
					"Repo zawiera skrypt ładujący próbkę danych, pliki .sql uruchamialne od zera, README z instrukcją oraz sensowną historię commitów w Git.",
			},
		],
		competencies: [
			{ name: "SQL", role: "required" },
			{ name: "Git", role: "required" },
			{ name: "Python", role: "acquired" },
		],
	},
	{
		slug: "ds-pierwszy-model-predykcyjny",
		title: "Pierwszy model predykcyjny: od baseline do rzetelnej ewaluacji",
		description:
			"Zbudujesz pierwszy model uczenia maszynowego w scikit-learn na realnych danych z UCI Online Retail (lub GUS BDL), unikając zbiorów-klisz. Przejdziesz pełną ścieżkę: model trywialny jako baseline, model właściwy, poprawna walidacja, metryki dobrane do problemu i krótka analiza błędów. Efektem jest reprodukowalny notebook oraz raport zawierający obowiązkową sekcję Ograniczenia.",
		level: "L1",
		estimatedHours: 6,
		sourceType: "open_data",
		sourceUrl: "https://archive.ics.uci.edu/dataset/352/online+retail",
		rubricJson: [
			{
				criterion: "Baseline przed modelem",
				weight: 20,
				description:
					"Notebook zawiera model trywialny (np. przewidywanie klasy większościowej lub średniej) policzony PRZED modelem właściwym, z metryką, do której odnosisz późniejszy wynik.",
			},
			{
				criterion: "Poprawna walidacja i opis ryzyka leakage",
				weight: 25,
				description:
					"Zastosowany jest rozdzielny podział train/test lub k-fold. Raport wprost opisuje, jak uniknięto wycieku danych (leakage): dopasowanie preprocessingu tylko na treningu, brak informacji z przyszłości, brak oceny na danych treningowych.",
			},
			{
				criterion: "Dobór metryk do problemu",
				weight: 20,
				description:
					"Metryki są dobrane świadomie do zadania i rozkładu klas (np. F1/precision/recall/ROC-AUC zamiast samej accuracy przy niezbalansowaniu; MAE/RMSE dla regresji), z uzasadnieniem wyboru.",
			},
			{
				criterion: "Analiza błędów",
				weight: 15,
				description:
					"Notebook zawiera krótką analizę, gdzie i dlaczego model się myli (np. macierz pomyłek, przykłady błędnych predykcji, grupy o gorszym wyniku).",
			},
			{
				criterion: "Reprodukowalność i sekcja Ograniczenia",
				weight: 20,
				description:
					"Ustawiony seed, requirements.txt, README, sensowna historia Git oraz raport z jawną sekcją Ograniczenia opisującą słabości danych, metody i wniosków.",
			},
		],
		competencies: [
			{ name: "Uczenie maszynowe", role: "required" },
			{ name: "Statystyka (Statistics)", role: "required" },
			{ name: "Python", role: "acquired" },
			{ name: "Pandas", role: "acquired" },
		],
	},
	{
		slug: "ds-llm-strukturalna-ekstrakcja",
		title: "Strukturalna ekstrakcja danych z tekstu za pomocą LLM",
		description:
			"Zbuduj mini-pipeline, który z surowych tekstów (np. ogłoszeń o pracę lub opisów produktów) wyciąga ustrukturyzowany JSON za pomocą modelu językowego i technik prompt engineering. Kluczem projektu nie jest samo wywołanie modelu, lecz zmierzenie jakości wyjścia na zbiorze ~30 przykładów: trafność wypełnionych pól i wykrywanie halucynacji. Artefaktem jest repozytorium z promptami, skryptem uruchomieniowym i tabelą ewaluacji. Pracuj na realnie darmowym tierze API bez karty kredytowej — Google Gemini API (free tier) lub Groq — w zupełności wystarczającym na ~30 przykładów; klucz API trzymaj w zmiennej środowiskowej, nie w repo. Jeśli używasz realnych ogłoszeń, usuń lub pseudonimizuj dane osobowe (nazwiska, e-maile, telefony) i nie commituj surowych rekordów kontaktowych.",
		level: "L1",
		estimatedHours: 5,
		sourceType: "oss",
		sourceUrl: "https://ai.google.dev/gemini-api/docs",
		rubricJson: [
			{
				criterion: "Jakość promptu",
				weight: 25,
				description:
					"Prompt jasno definiuje docelowy schemat JSON (nazwy i typy pól), zawiera instrukcje na wypadek braku danych (null zamiast zmyślania) i co najmniej jeden przykład (few-shot). Prompty są wersjonowane w repozytorium.",
			},
			{
				criterion: "Poprawność struktury wyjścia",
				weight: 25,
				description:
					"Skrypt parsuje odpowiedź modelu do walidowalnego JSON (np. przez schemat), obsługuje przypadki niepoprawnego formatu i raportuje odsetek odpowiedzi zgodnych ze schematem.",
			},
			{
				criterion: "Mini-ewaluacja z metryką",
				weight: 30,
				description:
					"Zbiór ~30 przykładów z ręcznie oznaczonym ground truth; policzona metryka trafności pól (np. accuracy per pole) oraz osobny wskaźnik halucynacji (pola wypełnione mimo braku danych w tekście). Wyniki w tabeli w repozytorium.",
			},
			{
				criterion: "Reprodukowalność",
				weight: 20,
				description:
					"README z instrukcją uruchomienia, plik requirements, ustawiony seed/temperatura, klucz API pobierany ze zmiennej środowiskowej (nie w repo), historia w Git.",
			},
		],
		competencies: [
			{ name: "LLM", role: "required" },
			{ name: "GenAI", role: "required" },
			{ name: "Python", role: "acquired" },
		],
	},
	{
		slug: "ds-databricks-pyspark-taxi",
		title: "Analiza dużych danych NYC Taxi w PySpark na Databricks",
		description:
			"Pracuj na platformie chmurowej Databricks Free Edition: pobierz duży zbiór przejazdów NYC TLC w formacie Parquet, wykonaj transformacje w PySpark i EDA na skali, która nie mieści się w pandas, a na końcu zbuduj prosty model. Zdefiniujesz metrykę sukcesu analizy jeszcze przed kodowaniem. Projekt uczy myślenia rozproszonego: leniwej ewaluacji, partycjonowania i unikania operacji ściągających cały zbiór do sterownika. Wszystko projektuj pod darmowe limity Free Edition, pracując na próbce danych.",
		level: "L2",
		estimatedHours: 12,
		sourceType: "open_data",
		sourceUrl: "https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page",
		rubricJson: [
			{
				criterion: "Framing problemu i metryka sukcesu",
				weight: 15,
				description:
					"Raport zaczyna się od jasno zdefiniowanej metryki sukcesu analizy (np. wyznaczenie średniego napiwku wg pory dnia z określoną dokładnością) i uzasadnienia, dlaczego skala danych wymaga Sparka, a nie pandas.",
			},
			{
				criterion: "Ingest i partycjonowanie",
				weight: 20,
				description:
					"Poprawny ingest plików Parquet NYC TLC do DataFrame Spark, świadomy dobór partycji, praca na reprezentatywnej próbce z uzasadnieniem doboru rozmiaru pod limity Free Edition.",
			},
			{
				criterion: "Transformacje PySpark",
				weight: 25,
				description:
					"Czyste, wektorowe transformacje w PySpark (filtry, agregacje, join, funkcje okna) bez zbędnych akcji materializujących; kod czytelny i skomentowany.",
			},
			{
				criterion: "EDA na skali i wnioski",
				weight: 25,
				description:
					"Analiza eksploracyjna prowadzona rozproszenie (agregaty liczone w Sparku, do pandas ściągane tylko zagregowane wyniki), z wnioskami odpowiadającymi na postawioną metrykę sukcesu. Wykryte anomalie i outliery opisane.",
			},
			{
				criterion: "Reprodukowalność",
				weight: 15,
				description:
					"Eksport notebooka Databricks + repozytorium z README, przypięte wersje bibliotek, ustawiony seed dla próbkowania i modelu, jawnie opisane kroki odtworzenia w Free Edition.",
			},
		],
		competencies: [
			{ name: "Databricks", role: "required" },
			{ name: "PySpark", role: "required" },
			{ name: "Spark", role: "required" },
			{ name: "Python", role: "acquired" },
			{ name: "SQL", role: "acquired" },
			{ name: "EDA", role: "acquired" },
		],
	},
	{
		slug: "ds-chmura-wdrozenie-modelu",
		title: "Wdrożenie modelu ML w chmurze jako endpoint",
		description:
			"Weź wytrenowany model predykcyjny z wcześniejszego projektu i wdróż go jako działający, publiczny endpoint. Domyślną, w pełni darmową i bezkartową drogą jest Streamlit Community Cloud lub Hugging Face Spaces — to tam powstaje trwały endpoint, do którego rekruter kliknie i zobaczy predykcję. Następnie opisujesz mapę wdrożenia na trzy chmury (Azure, GCP, AWS): na jaką usługę zarządzaną każdej z nich trafiłby ten sam model, jaki jest koszt i kompromisy — to dowód rozumienia chmury bez zakładania kont. UWAGA: darmowe tiery Azure/GCP/AWS wymagają karty kredytowej (nawet bez naliczenia opłaty), a Microsoft Learn Sandbox jest efemeryczny i nie utrzyma trwałego endpointu — bez karty cały projekt zrobisz na Streamlit/HF plus mapa wdrożenia. Zaczynasz od metryki sukcesu (latencja, dostępność) i guardraila; bezwzględny zakaz przekraczania darmowych kwot.",
		level: "L2",
		estimatedHours: 12,
		sourceType: "oss",
		sourceUrl: "https://docs.streamlit.io/deploy/streamlit-community-cloud",
		rubricJson: [
			{
				criterion: "Framing wdrożenia i metryka sukcesu",
				weight: 15,
				description:
					"Zdefiniowana metryka sukcesu wdrożenia (latencja, dostępność) i guardrail — przed uruchomieniem, nie po.",
			},
			{
				criterion: "Działające wdrożenie card-free (Streamlit/HF Spaces)",
				weight: 25,
				description:
					"Publiczny, klikalny endpoint z modelem na Streamlit Community Cloud lub Hugging Face Spaces (bez karty kredytowej); link w README.",
			},
			{
				criterion: "Mapa wdrożenia na Azure, GCP i AWS",
				weight: 20,
				description:
					"Pisemne porównanie: na jaką usługę zarządzaną każdej z trzech chmur trafiłby model, jaki koszt i kompromisy — dowód rozumienia, nie kliknięcia jednej platformy.",
			},
			{
				criterion: "Konteneryzacja i higiena konfiguracji",
				weight: 20,
				description:
					"Dockerfile/konfiguracja, pinowane zależności, sekrety w zmiennych środowiskowych (nie w repo), .gitignore.",
			},
			{
				criterion: "README dla rekrutera, reprodukowalność i Ograniczenia",
				weight: 20,
				description:
					"README z problemem, linkiem do demo, metryką i instrukcją odtworzenia; sekcja Ograniczenia (koszt, skalowanie, brak monitoringu).",
			},
		],
		competencies: [
			{ name: "Azure", role: "required" },
			{ name: "GCP", role: "required" },
			{ name: "AWS", role: "required" },
			{ name: "Python", role: "acquired" },
			{ name: "Git", role: "acquired" },
			{ name: "CI/CD", role: "acquired" },
			{ name: "Uczenie maszynowe", role: "acquired" },
		],
	},
	{
		slug: "ds-eksperyment-ab-memo",
		title: "Eksperyment A/B: od hipotezy do decision memo",
		description:
			"Przeprowadzisz pełny cykl eksperymentu A/B na publicznym zbiorze danych: od sformułowania hipotezy i metryki sukcesu, przez analizę mocy testu i minimalnego wykrywalnego efektu, po test statystyczny i interpretację istotności. Efektem końcowym jest jednostronicowe decision memo z rekomendacją biznesową napisaną dla nietechnicznego odbiorcy. Nauczysz się odróżniać istotność statystyczną od istotności praktycznej i unikać peekingu.",
		level: "L2",
		estimatedHours: 10,
		sourceType: "open_data",
		sourceUrl: "https://www.kaggle.com/datasets/yufengsui/mobile-games-ab-testing",
		rubricJson: [
			{
				criterion: "Framing: hipoteza, metryka sukcesu i guardrail",
				weight: 25,
				description:
					"Notebook zaczyna od jasno postawionej hipotezy zerowej i alternatywnej, jednej głównej metryki sukcesu (np. retencja) oraz co najmniej jednej metryki guardrail. Zdefiniowana jest jednostka randomizacji i kierunek oczekiwanego efektu.",
			},
			{
				criterion: "Analiza mocy testu i MDE",
				weight: 20,
				description:
					"Obliczona moc testu (power) oraz minimalny wykrywalny efekt (MDE) przy zadanym alfa i wielkości próby. Uzasadnione, czy próba jest wystarczająca do wykrycia efektu o rozmiarze istotnym biznesowo.",
			},
			{
				criterion: "Poprawny test statystyczny i interpretacja istotności",
				weight: 25,
				description:
					"Zastosowany właściwy test (t-test lub test proporcji z-test) z weryfikacją założeń, przedziałem ufności i rozmiarem efektu. Jeśli testowanych jest wiele metryk, zastosowana korekta wielokrotnych porównań. Interpretacja nie myli p-value z ważnością praktyczną.",
			},
			{
				criterion: "Decision memo dla nietechnicznego odbiorcy",
				weight: 20,
				description:
					"Jednostronicowe memo (Markdown/PDF) z jednoznaczną rekomendacją (wdrożyć / nie wdrażać / zebrać więcej danych), kontekstem biznesowym, ryzykami i guardrailami. Język zrozumiały bez wiedzy statystycznej, bez żargonu i surowych p-value bez interpretacji.",
			},
			{
				criterion: "Reprodukowalność i ograniczenia",
				weight: 10,
				description:
					"Repo z README, przypiętymi zależnościami i ustawionym ziarnem losowości; notebook uruchamia się od góry do dołu. Sekcja Ograniczenia opisuje zagrożenia walidacyjne (np. novelty effect, brak randomizacji na poziomie użytkownika, sezonowość).",
			},
		],
		competencies: [
			{ name: "A/B testing", role: "required" },
			{ name: "Statystyka (Statistics)", role: "required" },
			{ name: "Python", role: "acquired" },
			{ name: "Pandas", role: "acquired" },
		],
	},
	{
		slug: "ds-nlp-klasyfikacja-polskich-tekstow",
		title: "NLP: klasyfikacja polskich tekstów — baseline vs embeddingi",
		description:
			"Zbudujesz klasyfikator tekstu po polsku na publicznym korpusie: najpierw prosty baseline TF-IDF z modelem klasycznym, potem porównanie z reprezentacjami embeddingowymi z Hugging Face. Przeprowadzisz rzetelną walidację, dobierzesz metrykę do niezbalansowania klas (F1) i wykonasz analizę błędów na macierzy pomyłek. Nauczysz się rozpoznawać wyciek danych i pułapki polskiej fleksji.",
		level: "L2",
		estimatedHours: 12,
		sourceType: "open_data",
		sourceUrl: "https://huggingface.co/datasets/clarin-pl/polemo2-official",
		rubricJson: [
			{
				criterion: "Baseline TF-IDF + klasyczny model",
				weight: 20,
				description:
					"Zbudowany czytelny baseline: wektoryzacja TF-IDF plus prosty klasyfikator (regresja logistyczna lub liniowy SVM). Baseline jest punktem odniesienia, jego wynik jest raportowany, a preprocessing tekstu jest opisany.",
			},
			{
				criterion: "Model embeddingowy i uczciwe porównanie",
				weight: 25,
				description:
					"Reprezentacja embeddingowa z Hugging Face (np. polski model transformerowy lub zdaniowy) porównana z baseline na tym samym podziale i tej samej metryce. Wniosek, czy złożoność embeddingów jest uzasadniona zyskiem jakości.",
			},
			{
				criterion: "Walidacja, metryka i brak wycieku danych",
				weight: 25,
				description:
					"Poprawny podział train/val/test (lub walidacja krzyżowa), a wektoryzator dopasowany wyłącznie na treningu. Metryka dobrana do problemu — F1 (macro) przy niezbalansowaniu, nie sama accuracy. Uzasadniony wybór metryki.",
			},
			{
				criterion: "Analiza błędów (macierz pomyłek)",
				weight: 20,
				description:
					"Macierz pomyłek plus jakościowa analiza: które klasy się mylą, przykłady błędnych predykcji i hipotezy dlaczego (podobne słownictwo, fleksja, negacja, długość tekstu). Analiza prowadzi do konkretnych wniosków usprawniających.",
			},
			{
				criterion: "Reprodukowalność i ograniczenia",
				weight: 10,
				description:
					"Repo z README, przypiętymi zależnościami i ustawionym ziarnem; notebook uruchamia się od góry do dołu. Sekcja Ograniczenia opisuje ryzyka (licencja i dane osobowe w korpusie, obciążenie dziedzinowe, generalizacja poza korpus).",
			},
		],
		competencies: [
			{ name: "NLP", role: "required" },
			{ name: "Uczenie maszynowe", role: "required" },
			{ name: "Python", role: "acquired" },
			{ name: "Pandas", role: "acquired" },
			{ name: "LLM", role: "acquired" },
			{ name: "GenAI", role: "acquired" },
		],
	},
	{
		slug: "ds-mlops-pipeline-treningowy",
		title: "MLOps: reprodukowalny pipeline treningowy end-to-end",
		description:
			"Zbudujesz kompletny pipeline MLOps, który prowadzi model od notatnika do powtarzalnego systemu: śledzenie eksperymentów w MLflow, konteneryzacja w Dockerze, uruchomienie na lokalnym Kubernetesie (kind/k3d), minimalna infrastruktura jako kod w Terraform oraz zielone CI w GitHub Actions. Celem nie jest najlepszy model, lecz dowód, że każdy krok jest zautomatyzowany, wersjonowany i odtwarzalny na czystej maszynie. Artefaktem jest publiczne repozytorium z pełnym pipeline'em, README portfolio i diagramem architektury.",
		level: "L3",
		estimatedHours: 28,
		sourceType: "oss",
		sourceUrl: "https://mlflow.org/docs/latest/ml/getting-started/",
		rubricJson: [
			{
				criterion: "Śledzenie eksperymentów (MLflow)",
				weight: 20,
				description:
					"MLflow Tracking loguje parametry, metryki i artefakty co najmniej dwóch przebiegów; zarejestrowany jest model wraz z sygnaturą wejścia/wyjścia i wersją; w repo widać, jak porównać przebiegi i wskazać baseline.",
			},
			{
				criterion: "Konteneryzacja i deployment na Kubernetes",
				weight: 25,
				description:
					"Dockerfile buduje obraz treningowy/serwujący z przypiętymi wersjami zależności; manifesty k8s (Deployment/Job/Service) uruchamiają się na lokalnym klastrze kind/k3d; README pokazuje polecenia od zera do działającego poda oraz sposób weryfikacji (logi, endpoint predykcji).",
			},
			{
				criterion: "Infrastruktura jako kod (Terraform)",
				weight: 20,
				description:
					"Terraform deklaratywnie tworzy zasoby lokalnego środowiska (np. namespace, ConfigMap/Secret, deployment przez provider kubernetes); stan jest wersjonowany świadomie, a `terraform plan/apply/destroy` jest udokumentowane; brak ręcznych, nieudokumentowanych kroków.",
			},
			{
				criterion: "CI zielony (GitHub Actions)",
				weight: 20,
				description:
					"Workflow w publicznym repo (darmowe minuty) uruchamia lint, testy i build obrazu przy każdym push/PR; pipeline jest zielony, a odznaka statusu widnieje w README; nieudany krok blokuje merge.",
			},
			{
				criterion: "Reprodukowalność i README portfolio",
				weight: 15,
				description:
					"README wg szablonu (Cel, Dane, Metoda, Wynik, Wnioski/Ograniczenia, sekcja dla nie-technicznego czytelnika) zawiera diagram architektury, przypięte wersje, instrukcję odtworzenia na czystej maszynie oraz sekcję Ograniczenia; obcy użytkownik jest w stanie powtórzyć wynik.",
			},
		],
		competencies: [
			{ name: "MLOps", role: "required" },
			{ name: "CI/CD", role: "required" },
			{ name: "Kubernetes", role: "required" },
			{ name: "Terraform", role: "required" },
			{ name: "Python", role: "acquired" },
			{ name: "Git", role: "acquired" },
			{ name: "Uczenie maszynowe", role: "acquired" },
		],
	},
	{
		slug: "ds-capstone-strumien-i-raport",
		title: "CAPSTONE: strumień danych, detekcja anomalii i raport biznesowy",
		description:
			"Capstone spinający całą ścieżkę Data Scientist: zbudujesz strumień zdarzeń w Kafce (Docker/KRaft), zagregujesz go w PySpark Structured Streaming, wykryjesz anomalie z jawnym baseline'em (metoda statystyczna kontra prosty model) i przełożysz wynik na decyzję biznesową. Artefaktem portfolio-grade jest repozytorium z docker-compose, wdrożony dashboard w Streamlit oraz raport i decision memo wg szablonu Cel-Dane-Metoda-Wynik-Wnioski/Ograniczenia. Nacisk pada na poprawną obsługę czasu i okien oraz na walidację progu anomalii, a nie na efektowność modelu.",
		level: "L3",
		estimatedHours: 28,
		sourceType: "oss",
		sourceUrl: "https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html",
		rubricJson: [
			{
				criterion: "Pipeline strumieniowy Kafka to Spark",
				weight: 25,
				description:
					"Producent publikuje zdarzenia do topiku Kafka (KRaft, bez ZooKeepera) w Dockerze; PySpark Structured Streaming czyta topik, wykonuje agregacje w oknach czasowych z jawną obsługą event-time i watermark; strumień działa end-to-end i jest udokumentowany poleceniami uruchomienia.",
			},
			{
				criterion: "Detekcja anomalii z baseline",
				weight: 25,
				description:
					"Zaimplementowano co najmniej dwie metody detekcji (statystyczna, np. z-score/EWMA na oknie, oraz prosty model) porównane względem jawnego baseline; próg anomalii jest uzasadniony i zwalidowany, a nie dobrany arbitralnie; wykazano świadomość różnicy między szumem a sygnałem.",
			},
			{
				criterion: "Wdrożony dashboard (Streamlit)",
				weight: 20,
				description:
					"Dashboard w Streamlit prezentuje agregacje i wykryte anomalie w czasie; jest publicznie wdrożony (Streamlit Community Cloud lub odtwarzalny lokalnie z docker-compose) z działającym URL lub jednopoleceniową instrukcją uruchomienia.",
			},
			{
				criterion: "Raport biznesowy i decision memo",
				weight: 20,
				description:
					"Raport wg szablonu (Cel, Dane, Metoda, Wynik, Wnioski/Ograniczenia) jest zrozumiały dla nie-technicznego czytelnika i zawiera decision memo z konkretną rekomendacją; sekcja Ograniczenia uczciwie opisuje założenia, ryzyka fałszywych alarmów i granice metody.",
			},
			{
				criterion: "Reprodukowalność",
				weight: 10,
				description:
					"docker-compose podnosi Kafkę, producenta i przetwarzanie jednym poleceniem; README opisuje odtworzenie na czystej maszynie, przypięte wersje i sposób weryfikacji; obcy użytkownik uruchamia całość bez pomocy autora. docker-compose one-command; przypięte wersje Sparka i konektora spark-sql-kafka; README z instrukcją odtworzenia.",
			},
		],
		competencies: [
			{ name: "Kafka", role: "required" },
			{ name: "Spark", role: "required" },
			{ name: "PySpark", role: "required" },
			{ name: "Databricks", role: "acquired" },
			{ name: "MLOps", role: "acquired" },
			{ name: "Statystyka (Statistics)", role: "acquired" },
			{ name: "EDA", role: "acquired" },
		],
	},
];
