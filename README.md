# My Time Tracker

Προσωπική πλατφόρμα διαχείρισης χρόνου, σχεδιασμένη σαν επαγγελματικό SaaS προϊόν (sidebar, dashboard, reports, στατιστικά, AI βοηθός). Progressive Web App σε **vanilla HTML/CSS/JavaScript (ES modules)** — χωρίς framework, χωρίς bundler, χωρίς build step.

## Λειτουργίες

**Πλοήγηση**
- Sidebar (collapsible σε desktop, off-canvas drawer σε κινητό) με Dashboard, Ημερολόγιο, Timeline, Tasks, Reports, Στατιστικά, AI Βοηθός, Ρυθμίσεις, Υποστήριξη.
- Top bar με τίτλο σελίδας, τρέχουσα ημερομηνία + εβδομάδα (ISO), καθολική αναζήτηση (`/` για focus, highlight αποτελεσμάτων), κουμπί ειδοποιήσεων, εναλλαγή σκοτεινού θέματος, μενού λογαριασμού.
- Bottom navigation + floating action button σε κινητό.
- Hash-based routing (`js/router.js`) — κάθε σελίδα είναι bookmark-able και δουλεύει το κουμπί "πίσω" του browser.

**Dashboard** — 11 KPI κάρτες (ώρες σήμερα/εβδομάδας/μήνα, απόσταση από στόχο, ολοκληρωμένα/εκκρεμή tasks, πιο παραγωγική κατηγορία, δείκτης παραγωγικότητας, μέση διάρκεια task, συνεχόμενες ημέρες, focus score) + 5 γραφήματα (ώρες/ημέρα, ώρες/κατηγορία, μηνιαία τάση, ώρες/ημέρα εβδομάδας, τάση παραγωγικότητας) + πρόσφατη δραστηριότητα.

**Ημερολόγιο** — μηνιαία όψη με χρωματιστές τελείες κατηγορίας ανά ημέρα, ένδειξη καθυστέρησης/ολοκλήρωσης, month/year pickers, εβδομαδιαία όψη, "μετάβαση σήμερα", επιλογή ημέρας με animation. Quick timer bar πάντα ορατό (start/pause/stop).

**Timeline** — χρονολογική, κάθετη προβολή των tasks μιας ημέρας με ώρα, εικονίδιο κατηγορίας, προτεραιότητα, status, διάρκεια.

**Tasks** — πλήρες ιστορικό με φίλτρα (από/έως ημερομηνία, κατηγορία, status, προτεραιότητα, ετικέτα, αναζήτηση κειμένου).

**Reports** — σύνοψη περιόδου + γραφήματα ανά κατηγορία/status + εξαγωγή **Excel, PDF, CSV, Εκτύπωση**. Χρησιμοποιεί τα ίδια φίλτρα με το Tasks: αν υπάρχει ενεργό φίλτρο εξάγονται μόνο τα φιλτραρισμένα αποτελέσματα, αλλιώς όλα.

**Στατιστικά** — επιλογή περιόδου (ημέρα/εβδομάδα/μήνα/έτος), ποσοστό ολοκλήρωσης, μέση διάρκεια, focus score, πιο ενεργή ημέρα, ημερολόγιο δραστηριότητας τύπου heatmap (τελευταίοι ~12 μήνες), ώρες ανά κατηγορία/ημέρα εβδομάδας.

**AI Βοηθός** — chat-style UI. Δέχεται διαθέσιμες ώρες, ώρα έναρξης, διάλειμμα, προτεραιότητα ανά task· ελέγχει τις υπάρχουσες καταχωρήσεις της ημέρας και τοποθετεί τα tasks μόνο σε πραγματικά ελεύθερα διαστήματα (καθόλου επικαλύψεις), δίνοντας προτεραιότητα στα πιο σημαντικά· δείχνει ποια tasks δεν χώρεσαν· επιτρέπει επεξεργασία ωρών πριν την αποθήκευση. Λειτουργεί 100% τοπικά, χωρίς εξωτερικό AI API.

**Task model** — Τίτλος, περιγραφή, κατηγορία (προσαρμόσιμη: όνομα/χρώμα/εικονίδιο), status (Προγραμματισμένο/Σε εξέλιξη/Ολοκληρωμένο/Καθυστερημένο/Ακυρωμένο), προτεραιότητα (Κρίσιμη/Υψηλή/Μεσαία/Χαμηλή), ώρα έναρξης/λήξης, διάρκεια (auto), τοποθεσία, σημειώσεις, ετικέτες (chips), υπενθύμιση (in-app), επανάληψη (ημερήσια/εβδομαδιαία/μηνιαία — δημιουργεί ως 8 επόμενες εμφανίσεις), εκτιμώμενη διάρκεια, % ολοκλήρωσης.

**Ρυθμίσεις** — διαχείριση κατηγοριών (προσθήκη/επεξεργασία/διαγραφή, χρώμα, emoji εικονίδιο), σκοτεινό θέμα, εβδομαδιαίος στόχος ωρών, ενεργοποίηση/απενεργοποίηση υπενθυμίσεων, εξαγωγή/εισαγωγή/διαγραφή όλων των δεδομένων (JSON backup).

**Υποστήριξη** — FAQ, συντομεύσεις πληκτρολογίου.

**Άλλα** — Toast μηνύματα, modal επιβεβαίωσης για διαγραφές (καμία χρήση `alert`/`confirm`), empty states, loading states σε exports, focus states, καμία οριζόντια κύλιση στο κινητό, PWA (installable, offline-first για την καταγραφή χρόνου).

## Δομή project

```
mytimetracker/
├── index.html
├── manifest.json
├── service-worker.js
├── README.md
├── css/
│   ├── tokens.css        Design tokens: light/dark χρώματα, spacing, radius, shadow, gradients
│   ├── base.css           Reset, τυπογραφία, focus states, print base
│   ├── components.css     Κουμπιά, κάρτες, badges, toast, modal, tooltip, charts (κοινά)
│   ├── forms.css          Πεδία φορμών, toggle switch, tag input, color/icon pickers
│   ├── shell.css          Sidebar, topbar, quick timer bar, mobile bottom nav, FAB
│   ├── calendar.css       Ημερολόγιο (μήνας/εβδομάδα)
│   ├── timeline.css       Timeline σελίδα
│   ├── tasks.css          Tasks λίστα/φίλτρα + λίστα καταχωρήσεων ημέρας
│   ├── reports.css        Reports σελίδα + print stylesheet
│   ├── statistics.css     Heatmap legend
│   ├── assistant.css      AI Βοηθός (chat bubbles)
│   ├── settings.css       Category manager, FAQ, shortcuts
│   ├── dashboard.css      KPI κάρτες, chart layout, πρόσφατη δραστηριότητα
│   └── responsive.css     Όλα τα media queries
├── js/
│   ├── app.js             Εκκίνηση, route-scoped rendering, wiring modules
│   ├── state.js            Κεντρικό store (entries, κατηγορίες, assistant tasks, φίλτρα, UI state) + pub/sub
│   ├── storage.js          localStorage schema (v2) + migration από παλιά keys/schema
│   ├── router.js           Hash-based routing για το sidebar
│   ├── theme.js            Σκοτεινό θέμα (persistent)
│   ├── charts.js           Ελαφριά SVG charts (bar/line/donut/heatmap/sparkline) — καμία εξωτερική βιβλιοθήκη
│   ├── calendar.js         Ημερολόγιο μήνα/εβδομάδας
│   ├── entries.js          Modal καταχώρησης (πλήρες task model), CRUD, επαναλαμβανόμενα tasks
│   ├── timer.js            Quick timer bar
│   ├── assistant.js        AI Βοηθός (αλγόριθμος προγραμματισμού χωρίς επικαλύψεις)
│   ├── dashboard.js        KPIs + charts
│   ├── timeline.js         Timeline σελίδα
│   ├── tasks.js            Φίλτρα + λίστα Tasks σελίδας
│   ├── reports.js          Σύνοψη + Excel/PDF/CSV/Print εξαγωγή
│   ├── statistics.js       Heatmap + ανάλυση περιόδου
│   ├── categories.js       CRUD προσαρμόσιμων κατηγοριών
│   ├── settings.js         Σελίδα ρυθμίσεων (θέμα, στόχος, δεδομένα)
│   ├── search.js           Καθολική αναζήτηση με highlight
│   ├── notifications.js    Καθυστερημένα tasks + υπενθυμίσεις (in-app)
│   ├── ui.js               Toast, confirm modal, popovers, sidebar/mobile shell
│   └── utils.js            Βοηθητικές συναρτήσεις ημερομηνίας/ώρας/μορφοποίησης
└── assets/
    └── icons/
        └── icon.svg
```

## Αρχιτεκτονική rendering

Κάθε σελίδα (`js/*.js`) έχει `init()` (μια φορά, wiring event listeners) και `render()` (ζωγραφίζει το περιεχόμενο). Το `app.js` καλεί `render()` **μόνο για την ενεργή σελίδα** όταν αλλάζει state (`state.onChange`) ή όταν μπαίνεις σε νέα σελίδα (`router` `onEnter`) — όχι σε όλες τις σελίδες κάθε φορά. Αυτό αποφεύγει άχρηστα DOM updates (π.χ. typing στο φίλτρο του Tasks δεν ξαναζωγραφίζει τα charts του Dashboard).

## Πώς τρέχει τοπικά (Live Server)

Η εφαρμογή χρησιμοποιεί ES modules (`<script type="module">`) και service worker, οπότε **δεν** μπορεί να ανοιχτεί απευθείας με `file://` — χρειάζεται τοπικό HTTP server.

1. Άνοιξε τον φάκελο στο VS Code.
2. Εγκατέστησε την επέκταση **Live Server** (αν δεν την έχεις ήδη).
3. Δεξί κλικ στο `index.html` → **Open with Live Server**.
4. Η εφαρμογή ανοίγει σε κάτι σαν `http://127.0.0.1:5500`.

Εναλλακτικά, με Node.js εγκατεστημένο:

```bash
npx serve .
```

## Deploy στο Vercel

1. Δημιούργησε λογαριασμό στο [vercel.com](https://vercel.com) (αν δεν έχεις) και σύνδεσε το GitHub repo, ή χρησιμοποίησε το Vercel CLI:
   ```bash
   npm install -g vercel
   vercel
   ```
2. Επειδή είναι στατικό site (χωρίς build step), δεν χρειάζεται κανένα build command — άφησε τα πεδία "Build Command" και "Output Directory" κενά/default, ή όρισε Output Directory στο root (`.`).
3. Κάθε push στο συνδεδεμένο branch θα κάνει redeploy αυτόματα.
4. Μετά το πρώτο deploy, ανέβασε ξανά αν αλλάξεις το `CACHE_VERSION` στο `service-worker.js` ώστε οι χρήστες να πάρουν τη νέα έκδοση (δες παρακάτω).

## Πώς λειτουργούν τα exports

- **Excel**: [SheetJS/xlsx](https://sheetjs.com/), φορτώνεται δυναμικά από CDN τη στιγμή του export. Φύλλο "Καταχωρήσεις" + φύλλο "Summary" (σύνολα, ώρες ανά κατηγορία/status, περίοδος).
- **CSV**: δημιουργείται τοπικά (χωρίς εξωτερική βιβλιοθήκη), με UTF-8 BOM ώστε τα ελληνικά να ανοίγουν σωστά στο Excel.
- **Print**: `window.print()` πάνω στο περιεχόμενο της σελίδας Reports, με ξεχωριστό print stylesheet που κρύβει sidebar/topbar/κουμπιά.
- **PDF**: [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable), φορτωμένα δυναμικά από CDN.
  - **Ελληνικά στο PDF**: οι default γραμματοσειρές του jsPDF δεν περιέχουν ελληνικούς χαρακτήρες. Αντί να μπει font αρχείο μέσα στο repository, η εφαρμογή **κατεβάζει δυναμικά (runtime) μια γραμματοσειρά Roboto** από δημόσιο CDN πακέτο τη στιγμή του export και την ενσωματώνει στο PDF μέσω VFS του jsPDF — κανένα binary font αρχείο στο git repo. Επαληθεύτηκε ότι τα ελληνικά (με τόνους) εξάγονται σωστά και ως επιλέξιμο κείμενο. Αν αποτύχει η λήψη (π.χ. offline), η εξαγωγή συνεχίζει με προεπιλεγμένη γραμματοσειρά και εμφανίζεται προειδοποίηση.
- Excel/PDF/CSV χρησιμοποιούν τα **φιλτραρισμένα** αποτελέσματα (ίδια φίλτρα με τη σελίδα Tasks) αν υπάρχει ενεργό φίλτρο, αλλιώς **όλες** τις καταχωρήσεις. Όνομα αρχείου: `my-time-tracker-YYYY-MM-DD.{xlsx,pdf,csv}`.

## Περιορισμοί localStorage

- Τα δεδομένα αποθηκεύονται **μόνο τοπικά στον browser** (localStorage), κάτω από το key `mytimetracker_state_v1`. Δεν συγχρονίζονται μεταξύ συσκευών ή browsers.
- Αν καθαρίσεις τα δεδομένα περιήγησης (site data / cookies), θα χαθούν όλες οι καταχωρήσεις — γι' αυτό υπάρχει "Εξαγωγή JSON" στις Ρυθμίσεις για τακτικό backup.
- Όριο μεγέθους (συνήθως ~5MB ανά domain) — επαρκεί άνετα για χρόνια προσωπικής χρήσης, αλλά δεν είναι απεριόριστο.
- Η εφαρμογή κάνει αυτόματο **migration**: από παλιότερα ξεχωριστά localStorage keys (`mytimetracker_entries_v3/v5/v6`, `mytimetracker_assistant_v1/v2`) ΚΑΙ από παλιότερο schema (v1, χωρίς κατηγορίες/προτεραιότητα/ετικέτες) στο τρέχον ενοποιημένο schema v2 — αυτόματα, με ασφαλή defaults, χωρίς να διαγράφει τα παλιά keys.
- **Υπενθυμίσεις**: λειτουργούν μόνο όσο η εφαρμογή είναι ανοιχτή σε μια καρτέλα του browser (in-app toast, με έλεγχο κάθε 30 δευτερόλεπτα) — δεν υπάρχει background server για πραγματικά push notifications όταν η καρτέλα είναι κλειστή.

## Μελλοντική σύνδεση με Supabase

Η αρχιτεκτονική (`state.js` + `storage.js`) είναι σχεδιασμένη ώστε η αποθήκευση να είναι απομονωμένη σε ένα σημείο: το `storage.js` εκθέτει `loadState()` / `persistState()`, και το `state.js` είναι το μόνο σημείο που τα καλεί. Για μελλοντική σύνδεση με [Supabase](https://supabase.com):

1. Authentication (Supabase Auth) για πραγματικό λογαριασμό χρήστη (το avatar menu σήμερα δεν έχει sign-in — είναι τοπικό placeholder).
2. Επέκταση του `storage.js` ώστε το `persistState()` να κάνει upsert σε πίνακα Postgres, με το localStorage ως offline-first cache.
3. Real-time sync μέσω Supabase Realtime, με το `state.js`'s `onChange` να ενημερώνει το UI.
4. Πραγματικά push reminders μέσω server (π.χ. Web Push) αντί για το σημερινό in-app-only mechanism.
5. Migration script που ανεβάζει τα τοπικά δεδομένα στον λογαριασμό με το πρώτο login.

Δεν έχει υλοποιηθεί ακόμα — η εφαρμογή σήμερα λειτουργεί 100% τοπικά.

## Σημείωση για το service worker

Το `CACHE_VERSION` στο `service-worker.js` πρέπει να αλλάζει σε κάθε deploy που πειράζει HTML/CSS/JS, ώστε το `activate` event να καθαρίσει το παλιό cache. Χρησιμοποιεί network-first στρατηγική (βλέπεις πάντα τις τελευταίες αλλαγές όσο έχεις σύνδεση· το cache χρησιμεύει ως offline fallback). Cross-origin requests (CDN scripts για exports) δεν παρεμβάλλονται καθόλου από τον service worker.

## Γνωστοί περιορισμοί / επόμενα βήματα

- Οι υπενθυμίσεις είναι best-effort in-app (όχι πραγματικά push notifications — βλ. παραπάνω).
- Η επανάληψη tasks δημιουργεί ένα πεπερασμένο πλήθος (8) μελλοντικών εμφανίσεων· δεν υπάρχει ακόμα "επεξεργασία όλης της σειράς" μετά τη δημιουργία.
- Δεν υπάρχει πραγματικό multi-user / authentication σύστημα (το avatar menu είναι τοπικό placeholder).
- Δεν υπάρχουν swipe gestures σε κινητό (μόνο tap-based αλληλεπίδραση).
