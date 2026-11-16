# Právní náležitosti webu – co je hotové a co zbývá

Stav k 16. 11. 2026. Tento dokument **není právní posudek**. Texty byly připraveny podle skutečného stavu kódu webu; před spuštěním je doporučujeme nechat zkontrolovat odborníkem na ochranu osobních údajů. Web **nelze označit za plně v souladu s předpisy**, dokud nejsou doplněny údaje níže.

Legenda: **[ZÁKON]** = vyžaduje právní předpis · **[DOPORUČENÍ]** = osvědčená praxe, ne přímá povinnost.

---

## 1. Údaje, které musí doplnit provozovatel (`src/site.json`, pak `python3 build.py`)

Na webu se zatím zobrazují jako žluté **[DOPLNIT: …]**. `build.py` je po každém sestavení vypíše.

| Pole | Co doplnit | Kde se zobrazuje | Proč |
|---|---|---|---|
| `operator.name` | jméno a příjmení podnikatele, nebo obchodní firma | všechny právní stránky | [ZÁKON] § 435 OZ, čl. 13 GDPR (totožnost správce) |
| `operator.legalForm` | fyzická osoba – podnikatel / s.r.o. / … | Identifikační údaje | [DOPORUČENÍ] pro jednoznačnost; u obchodní korporace je součástí firmy |
| `operator.seat` | adresa sídla / místa podnikání | Identifikační údaje, Ochrana OÚ | [ZÁKON] § 435 OZ, čl. 13 GDPR |
| `operator.ico` | IČO | všechny právní stránky | [ZÁKON] § 435 OZ |
| `operator.registration` | zápis v OR (soud, oddíl, vložka), nebo v živnostenském rejstříku | Identifikační údaje | [ZÁKON] § 435 odst. 2 OZ (zapsaný podnikatel) |
| `operator.dic` | DIČ, nebo text „neplátce DPH“ | Identifikační údaje | [ZÁKON] pro plátce DPH na daňových dokladech; na webu [DOPORUČENÍ] |
| `operator.email` | kontaktní e-mail | všechny právní stránky | [ZÁKON] § 5 zák. 480/2004 Sb., čl. 13 GDPR |
| `operator.phone` | telefon | Identifikační údaje, Ochrana OÚ | [DOPORUČENÍ] |
| `operator.dataBox` | ID datové schránky, pokud existuje (jinak řádek odstraňte ze šablony) | Identifikační údaje | [DOPORUČENÍ] |
| `operator.supervision` | příslušný živnostenský úřad, případně další dozorový orgán | Identifikační údaje | [ZÁKON] § 5 zák. 480/2004 Sb., podléhá-li činnost povolení – ověřit |
| `privacy.bookingRetention` | jak dlouho po termínu uchováváte údaje z rezervací | Ochrana OÚ | [ZÁKON] čl. 13 odst. 2 písm. a) GDPR |
| `privacy.contactRetention` | jak dlouho uchováváte korespondenci | Ochrana OÚ | [ZÁKON] čl. 13 odst. 2 písm. a) GDPR |
| `privacy.hosting` | název a sídlo poskytovatele hostingu | Ochrana OÚ | [ZÁKON] čl. 13 odst. 1 písm. e) GDPR (příjemci) |
| `privacy.hostingLogs` | zda hosting vede přístupové logy a jak dlouho | Ochrana OÚ | [ZÁKON] čl. 13 GDPR – ověřit u hostingu |
| `privacy.dpo` | kontakt na pověřence, pokud byl jmenován | Ochrana OÚ | [ZÁKON] čl. 37 GDPR – malá cukrárna jej zpravidla jmenovat nemusí; potvrďte |
| `booking.endpoint` + `booking.endpointProvider` | adresa a poskytovatel služby pro příjem rezervací (např. Formspree) | Ochrana OÚ (text se přepne) | [ZÁKON] čl. 28 GDPR – smlouva o zpracování s poskytovatelem |

## 2. Výroky k potvrzení (na webu jako **[POTVRDIT: …]**)

* **Pověřenec** – text předpokládá, že správce pověřence nejmenoval (čl. 37 GDPR).
* **HTTPS** – text uvádí, že web je dostupný jen přes HTTPS. Zajistit u hostingu (včetně přesměrování z http).
* **Služba pro rezervace mimo EU** – zobrazí se jen při vyplnění `booking.endpoint`; ověřit, kde poskytovatel data ukládá.

## 3. Nalezené cookies a technologie ukládání

| Název | Typ | Kategorie | Účel | Platnost |
|---|---|---|---|---|
| `cn_consent` | cookie první strany | nezbytné | volba souhlasu + čas (`ts`) + verze | 180 dní |
| `cn_consent` | localStorage | nezbytné | totéž, **jen** pokud prohlížeč cookies nepřijímá | 180 dní (hlídá skript) |
| `cn_theme` | cookie první strany | nezbytné (na žádost uživatele) | světlý / tmavý režim, vzniká jen po přepnutí | 180 dní |
| `cn_t` | cookie první strany | nezbytné | zkouška, zda cookies fungují; ihned smazána | okamžitě |
| `cn_maps` | cookie první strany | **odstraněna** | dřívější souhlas s mapou; nyní kategorie „maps“, stará cookie se při návštěvě maže | – |
| cookies Google | třetí strana | obsah třetích stran | jen po souhlasu s mapou; názvy a dobu určuje Google | dle Google |

Analytické a marketingové nástroje: **žádné**. Externí písma, CDN skripty, sledovací pixely, vložená videa: **žádné**.

## 4. Služby třetích stran k posouzení

* **Google Maps (vložená mapa)** – načte se až po souhlasu (kategorie „maps“). Posoudit postavení provozovatele při vložení obsahu třetí strany (rozsudek SDEU C-40/17 *Fashion ID* – možná společná správa pro fázi shromáždění a předání údajů).
* **Instagram (Meta)** – bez nastaveného `booking.endpoint` odesílá zákazník rezervaci sám zprávou přes Instagram; Meta je samostatný správce. Zvážit, zda je tento postup pro rezervace vhodný, nebo nastavit vlastní příjem rezervací.
* **Služba pro příjem rezervací** (až bude nastavena) – nutná smlouva o zpracování (čl. 28 GDPR), ověřit umístění dat.
* **Hosting** – smlouva o zpracování, přístupové logy, HTTPS.
* Odkazy na Instagram a Facebook jsou obyčejné odkazy – nic se nepředává, dokud uživatel neklikne.

## 5. Zbývající právní a technické otázky

1. **Poznámka v rezervaci a alergie** – informace o alergii je údaj o zdraví (čl. 9 GDPR). Zásady proto žádají, aby zákazníci zdravotní údaje do poznámky nepsali. Pokud je provozovatel potřebuje (dorty na zakázku), je nutné doplnit právní základ podle čl. 9 odst. 2 GDPR – konzultovat.
2. **Zaškrtávací pole u rezervace** – jde o potvrzení seznámení s podmínkami, nikoli o souhlas se zpracováním (právním základem je smlouva). Text je tak formulován; nepřepisovat na „souhlasím se zpracováním“.
3. **Podmínky rezervace a Prohlášení o přístupnosti** zůstávají v dialogu na hlavní stránce (beze změny obsahu, kromě sjednocení zástupných textů). Jejich obsah nebyl součástí tohoto úkolu a obsahuje vlastní položky k doplnění (`terms.*` v `site.json`).
4. **Kategorie „Obsah třetích stran – mapa Google“** je navíc k požadovaným kategoriím Nezbytné / Analytické / Marketingové. Mapu nelze poctivě zařadit do žádné z nich a vyžaduje vlastní souhlas.
5. **Analytické a marketingové přepínače** jsou připravené, ale nic nespouštějí. Při přidání nástroje: vložit skript jako `type="text/plain" data-consent="…" data-cookies="…"`, popsat jej v `src/pages/zasady-cookies.html` a v zásadách OÚ, a **zvýšit `CONSENT_VERSION`** v `src/partials/consent.js`, aby byli všichni znovu dotázáni.
6. **Lišta cookies** – protože web dnes nepoužívá žádné volitelné cookies, samotná lišta by podle § 89 odst. 3 nebyla nutná [DOPORUČENÍ]; je potřeba kvůli souhlasu s mapou a připravenosti na budoucí nástroje.
7. **Platnost souhlasu 180 dní** – rozhodnutí provozovatele [DOPORUČENÍ]; lze změnit v `MAX_AGE_DAYS`.
8. **Doba uchování dat** a **smlouvy o zpracování** musí odpovídat skutečné praxi provozovatele – web je nemůže zajistit sám.

## 6. Jak otestovat před nasazením

```bash
python3 build.py
```
```bash
python3 -m http.server 8765 --bind 127.0.0.1
```
```bash
node tests/consent-e2e.js
```

Ruční kontrola (v anonymním okně prohlížeče, přes http/https – ne otevřením souboru):

1. První návštěva: lišta se zobrazí; v nástrojích vývojáře (Application → Cookies) není žádná cookie; v sekci Kontakt se mapa nenačetla.
2. „Odmítnout všechny“ → cookie `cn_consent` má `analytics/marketing/maps: false` a čas `ts`; po obnovení se lišta nezobrazí.
3. Patička → „Nastavení cookies“ → zapnout jen mapu → mapa se načte; vypnout → mapa zmizí.
4. „Přijmout všechny“ na jedné stránce → na ostatních stránkách se lišta nezobrazí.
5. Ovládání jen klávesnicí: Tab vede nejprve do lišty, Esc zavře nastavení, fokus se vrátí.
6. Všechny odkazy v patičce na počítači i telefonu; staré odkazy `#pravni-osobni`, `#pravni-cookies`, `#pravni-provozovatel` přesměrují na nové stránky.
7. Konzole prohlížeče bez chyb.
8. Po doplnění údajů: `python3 build.py` nesmí vypsat žádné „Still to fill in“ a na stránkách nesmí zůstat žádné [DOPLNIT] ani [POTVRDIT].
