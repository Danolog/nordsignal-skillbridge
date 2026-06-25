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
	// ── Data Scientist / ML (7 projects: 2 L1, 3 L2, 2 L3) ──
	{
		slug: "eda-titanic-pandas-numpy",
		title: "Eksploracyjna analiza danych Titanic (Pandas + NumPy)",
		description:
			"Pobierz klasyczny dataset Titanic z Kaggle. Wczytaj go za pomocą Pandas, przeprowadź czyszczenie i imputację braków, policz statystyki przeżywalności wg klas i płci. Wygeneruj wykresy w Matplotlib i Seaborn.",
		level: "L1",
		estimatedHours: 5,
		sourceType: "open_data",
		sourceUrl: "https://www.kaggle.com/c/titanic/data",
		rubricJson: [
			{
				criterion: "Wczytanie i czyszczenie danych",
				weight: 25,
				description: "Imputacja braków, kasty typów, podstawowa walidacja",
			},
			{
				criterion: "Analiza eksploracyjna",
				weight: 35,
				description: "Min. 5 wykresów (Matplotlib/Seaborn) z opisami",
			},
			{
				criterion: "Operacje NumPy",
				weight: 20,
				description: "Min. 3 operacje wektorowe / agregacje na ndarray",
			},
			{
				criterion: "Wnioski",
				weight: 20,
				description: "Min. 5 wniosków popartych statystykami",
			},
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "Pandas", role: "required" },
			{ name: "NumPy", role: "required" },
			{ name: "Matplotlib", role: "required" },
			{ name: "Seaborn", role: "required" },
			{ name: "Statystyka", role: "acquired" },
		],
	},
	{
		slug: "klasyfikator-iris-scikit-learn",
		title: "Pierwszy model ML: klasyfikator gatunków irysów (Scikit-learn)",
		description:
			"Zbuduj klasyfikator gatunków irysów na podstawie datasetu UCI Iris. Wytrenuj 3 modele (Logistic Regression, Random Forest, KNN), porównaj accuracy na train/test split i confusion matrix.",
		level: "L1",
		estimatedHours: 4,
		sourceType: "open_data",
		sourceUrl: "https://archive.ics.uci.edu/dataset/53/iris",
		rubricJson: [
			{
				criterion: "Podział train/test i preprocessing",
				weight: 25,
				description: "Standaryzacja, train_test_split z stratify",
			},
			{
				criterion: "Trzy modele Scikit-learn",
				weight: 35,
				description: "LogisticRegression, RandomForest, KNN — każdy fit i predict",
			},
			{
				criterion: "Ewaluacja",
				weight: 25,
				description: "Accuracy + classification_report + confusion matrix",
			},
			{
				criterion: "Interpretacja wyników",
				weight: 15,
				description: "Krótka analiza dlaczego dany model wygrał",
			},
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "Scikit-learn", role: "required" },
			{ name: "Machine Learning", role: "required" },
			{ name: "Pandas", role: "required" },
		],
	},
	{
		slug: "predykcja-churn-feature-engineering",
		title: "Predykcja odejścia klientów telco (Feature Engineering + ML)",
		description:
			"Zbuduj model przewidujący churn klientów na podstawie Telco Customer Churn (Kaggle). Skup się na feature engineeringu — kodowanie zmiennych kategorycznych, binning, interakcje cech, scaling. Porównaj 2 modele Scikit-learn z baseline.",
		level: "L2",
		estimatedHours: 12,
		sourceType: "open_data",
		sourceUrl: "https://www.kaggle.com/datasets/blastchar/telco-customer-churn",
		rubricJson: [
			{
				criterion: "Feature engineering",
				weight: 35,
				description: "One-hot/target encoding, binning, min. 3 nowe cechy interakcyjne",
			},
			{
				criterion: "Modele i tuning",
				weight: 30,
				description: "Min. 2 modele Scikit-learn + GridSearchCV",
			},
			{
				criterion: "Ewaluacja",
				weight: 20,
				description: "ROC-AUC, precision/recall, krzywa PR, wykresy w Matplotlib",
			},
			{
				criterion: "Wersjonowanie i powtarzalność",
				weight: 15,
				description: "Repo Git z requirements.txt i README",
			},
		],
		competencies: [
			{ name: "Scikit-learn", role: "required" },
			{ name: "Feature Engineering", role: "required" },
			{ name: "Pandas", role: "required" },
			{ name: "NumPy", role: "required" },
			{ name: "Machine Learning", role: "required" },
			{ name: "Matplotlib", role: "required" },
			{ name: "Git/GitHub", role: "acquired" },
		],
	},
	{
		slug: "klasyfikator-mnist-tensorflow",
		title: "Sieć neuronowa do rozpoznawania cyfr MNIST (TensorFlow)",
		description:
			"Zbuduj prostą sieć neuronową w TensorFlow/Keras klasyfikującą ręcznie pisane cyfry z datasetu MNIST. Przetestuj 2 architektury (MLP vs CNN), porównaj accuracy i zwizualizuj błędne predykcje.",
		level: "L2",
		estimatedHours: 10,
		sourceType: "open_data",
		sourceUrl: "https://yann.lecun.com/exdb/mnist/",
		rubricJson: [
			{
				criterion: "Przygotowanie danych",
				weight: 15,
				description: "Normalizacja pikseli, reshape, podział train/val/test",
			},
			{
				criterion: "Architektura MLP",
				weight: 25,
				description: "Sekwencyjny model z min. 2 warstwami Dense + Dropout",
			},
			{
				criterion: "Architektura CNN",
				weight: 30,
				description: "Conv2D + MaxPooling + Dense, training z early stopping",
			},
			{
				criterion: "Analiza wyników",
				weight: 30,
				description: "Confusion matrix + galeria błędnych predykcji w Matplotlib",
			},
		],
		competencies: [
			{ name: "Python", role: "required" },
			{ name: "TensorFlow", role: "required" },
			{ name: "Deep Learning", role: "required" },
			{ name: "NumPy", role: "required" },
			{ name: "Matplotlib", role: "acquired" },
		],
	},
	{
		slug: "pipeline-ml-git-dvc",
		title: "End-to-end ML pipeline z wersjonowaniem (Git + DVC)",
		description:
			"Zbuduj reprodukowalny pipeline ML: pobranie danych, czyszczenie, feature engineering, trening, ewaluacja. Wersjonuj kod w Git i dane/modele w DVC. Wszystko jako repozytorium gotowe do uruchomienia jednym `dvc repro`.",
		level: "L2",
		estimatedHours: 14,
		sourceType: "oss",
		sourceUrl: "https://github.com/iterative/example-versioning",
		rubricJson: [
			{
				criterion: "Struktura repo i Git workflow",
				weight: 25,
				description: "Branche feature/main, min. 5 commitów z konkretnymi zmianami",
			},
			{
				criterion: "DVC pipeline",
				weight: 35,
				description: "dvc.yaml z min. 3 stages, dvc repro działa end-to-end",
			},
			{
				criterion: "Modelowanie i ewaluacja",
				weight: 25,
				description: "Model Scikit-learn + metryki w pliku JSON",
			},
			{
				criterion: "Dokumentacja",
				weight: 15,
				description: "README z opisem pipeline i instrukcją uruchomienia",
			},
		],
		competencies: [
			{ name: "Git/GitHub", role: "required" },
			{ name: "Scikit-learn", role: "required" },
			{ name: "Feature Engineering", role: "required" },
			{ name: "Machine Learning", role: "required" },
			{ name: "Python", role: "required" },
		],
	},
	{
		slug: "sentiment-pytorch-cloud-deploy",
		title: "Klasyfikacja sentymentu recenzji (PyTorch + deployment Cloud)",
		description:
			"Zbuduj model klasyfikacji sentymentu recenzji filmowych w PyTorch (LSTM lub fine-tune BERT z HuggingFace). Wystaw model jako REST API i zdeployuj na AWS Lambda lub Google Cloud Run. Udokumentuj koszt inferencji i latency.",
		level: "L3",
		estimatedHours: 25,
		sourceType: "oss",
		sourceUrl: "https://huggingface.co/datasets/imdb",
		rubricJson: [
			{
				criterion: "Model PyTorch",
				weight: 30,
				description: "LSTM lub BERT fine-tune, training loop z DataLoader",
			},
			{
				criterion: "REST API",
				weight: 20,
				description: "FastAPI/Flask endpoint /predict z walidacją inputu",
			},
			{
				criterion: "Deployment Cloud",
				weight: 30,
				description: "AWS Lambda lub GCP Cloud Run, działa publiczny URL",
			},
			{
				criterion: "Komunikacja wyników",
				weight: 20,
				description: "Raport: latency, koszt, accuracy, decyzje architektoniczne",
			},
		],
		competencies: [
			{ name: "PyTorch", role: "required" },
			{ name: "Deep Learning", role: "required" },
			{ name: "Cloud (AWS/GCP/Azure)", role: "required" },
			{ name: "Python", role: "required" },
			{ name: "Komunikacja wyników", role: "required" },
			{ name: "Git/GitHub", role: "acquired" },
		],
	},
	{
		slug: "raport-ml-prezentacja-stakeholder",
		title: "Case study ML: predykcja + raport biznesowy + prezentacja",
		description:
			"Wybierz dataset biznesowy (np. House Prices z Kaggle). Zbuduj model regresyjny, ale 70% pracy to komunikacja: napisz raport (markdown/PDF) z wnioskami dla nietechnicznego stakeholdera, przygotuj 10-slide deck i nagraj 5-minutową prezentację.",
		level: "L3",
		estimatedHours: 18,
		sourceType: "open_data",
		sourceUrl: "https://www.kaggle.com/competitions/house-prices-advanced-regression-techniques",
		rubricJson: [
			{
				criterion: "Model i wyniki",
				weight: 25,
				description: "Min. 2 modele Scikit-learn + cross-validation + RMSE",
			},
			{
				criterion: "Wizualizacje",
				weight: 25,
				description: "Min. 6 wykresów Matplotlib/Seaborn skierowanych do biznesu",
			},
			{
				criterion: "Raport biznesowy",
				weight: 30,
				description: "Markdown/PDF: streszczenie, kluczowe insighty, rekomendacje",
			},
			{
				criterion: "Prezentacja",
				weight: 20,
				description: "10-slide deck + nagranie 5 min — bez żargonu technicznego",
			},
		],
		competencies: [
			{ name: "Komunikacja wyników", role: "required" },
			{ name: "Machine Learning", role: "required" },
			{ name: "Wizualizacja danych", role: "required" },
			{ name: "Matplotlib", role: "required" },
			{ name: "Seaborn", role: "required" },
			{ name: "Pandas", role: "required" },
		],
	},
];
