# ══════════════════════════════════════════════════════════════════════
# PIECZĄTKA — blok wspólny. NIE ZMIENIAJ NICZEGO PONIŻEJ TEJ LINII.
# (Ten sam blok jest w każdym notebooku ścieżki; zmiana = inny token,
#  którego SkillBridge nie przyjmie.)
# ══════════════════════════════════════════════════════════════════════
import base64 as _b64
import hashlib as _hashlib
import hmac as _hmac
import json as _json
import math as _math


def _pieczatka_kanonicznie(ladunek):
    # Musi dawać IDENTYCZNY tekst co serwer SkillBridge:
    # klucze posortowane, bez spacji, liczby całkowite bez ".0",
    # ułamki zaokrąglone do 6 miejsc, polskie znaki bez escapowania.
    def _norm(v):
        if isinstance(v, bool):
            return v
        if isinstance(v, float):
            if not _math.isfinite(v):
                return None
            r = round(v, 6)
            return int(r) if r.is_integer() else r
        if isinstance(v, (list, tuple)):
            return [_norm(x) for x in v]
        return v

    obj = {k: _norm(ladunek[k]) for k in sorted(ladunek)}
    return _json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


def _pieczatka_token(kod_atomu, ladunek):
    tresc = _pieczatka_kanonicznie(ladunek).encode("utf-8")
    czesc = _b64.urlsafe_b64encode(tresc).decode("ascii").rstrip("=")
    podpis = _hmac.new(kod_atomu.encode("utf-8"), tresc, _hashlib.sha256).hexdigest()[:12]
    return czesc + "." + podpis


try:
    _ladunek = _zbierz_wyniki()
except Exception as _blad:  # noqa: BLE001 — komunikat dla studenta, nie traceback
    print("Pieczątka nie może jeszcze policzyć tokenu:")
    print("  → " + str(_blad))
else:
    _kod = input("Wpisz kod atomu z SkillBridge i wciśnij Enter: ").strip()
    if not _kod:
        print("Nie wpisano kodu atomu — uruchom tę komórkę jeszcze raz")
        print("i przepisz kod widoczny w SkillBridge przy tej pozycji.")
    else:
        print()
        print("Twój token (skopiuj CAŁĄ linię poniżej i wklej w SkillBridge):")
        print(_pieczatka_token(_kod, _ladunek))
