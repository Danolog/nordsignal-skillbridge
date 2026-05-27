// A1/RODO: wersjonowanie zgody na publiczne udostępnienie paszportu.
//
// Ślad audytowy musi dowodzić, JAKĄ treść zgody widział student. Dlatego ten
// numer jest jedynym źródłem prawdy — bump go ZAWSZE, gdy zmienia się treść
// ekranu zgody w `passport-view.tsx` (tytuł, lista ujawnianych danych, callout).
// Klient wysyła wersję, którą wyświetlił; serwer odrzuca rozjazd (stary klient).
//
// Historia:
//   v1 — pierwsza wersja (placeholder, „każdy, kto go otrzyma").
//   v2 — copy Sophii + callout Mili: jawna lista danych, „bez logowania i bez
//        Twojej wiedzy", odwracalność wyłączeniem linku.
export const PASSPORT_SHARE_CONSENT_VERSION = "v2";
