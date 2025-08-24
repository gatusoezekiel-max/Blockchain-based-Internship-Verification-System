;; InternshipRegistry Smart Contract
;; Core contract for registering internship experiences on the Stacks blockchain.
;; Ensures unique registration with a hash of key details and robust validation.

;; Constants
(define-constant ERR-ALREADY-REGISTERED u100)
(define-constant ERR-INVALID-HASH u101)
(define-constant ERR-INVALID-PRINCIPAL u102)
(define-constant ERR-INVALID-STRING-LENGTH u103)
(define-constant ERR-INVALID-DATE u104)
(define-constant ERR-INVALID-SKILLS-LIST u105)
(define-constant ERR-NOT-AUTHORIZED u106)
(define-constant ERR-INVALID-STATUS u107)
(define-constant ERR-INVALID-DURATION u108)
(define-constant ERR-INVALID-DESCRIPTION u109)
(define-constant ERR-INVALID-ROLE u110)
(define-constant ERR-INVALID-COMPANY-NAME u111)
(define-constant ERR-INVALID-LOCATION u112)
(define-constant ERR-INVALID-CONTACT-INFO u113)
(define-constant ERR-INVALID-ACHIEVEMENTS-LIST u114)
(define-constant ERR-INVALID-REFERENCES-LIST u115)
(define-constant MAX-STRING-LENGTH u256)
(define-constant MAX-LIST-LENGTH u20)
(define-constant MIN-DURATION u1) ;; Minimum internship duration in blocks (~1 day)

;; Data Maps
(define-map internships
  { internship-hash: (buff 32) } ;; SHA-256 hash of intern|company|role|start|end
  {
    intern: principal,
    company: principal,
    role: (string-utf8 100),
    start-date: uint,
    end-date: uint,
    skills: (list 20 (string-utf8 50)),
    description: (string-utf8 500),
    status: (string-utf8 20),
    duration: uint,
    company-name: (string-utf8 100),
    location: (string-utf8 100),
    contact-info: (string-utf8 200),
    achievements: (list 10 (string-utf8 200)),
    references: (list 5 principal),
    registration-timestamp: uint
  }
)

(define-map internship-owners
  { internship-hash: (buff 32) }
  { owner: principal }
)

;; Private Functions
(define-private (validate-string (str (string-utf8 500)) (max-len uint))
  (if (> (len str) max-len)
    (err ERR-INVALID-STRING-LENGTH)
    (ok true)
  )
)

(define-private (validate-list-length (lst (list 20 (string-utf8 50))) (max-len uint))
  (if (> (len lst) max-len)
    (err ERR-INVALID-SKILLS-LIST)
    (ok true)
  )
)

(define-private (validate-principal (p principal))
  (if (is-eq p 'SP000000000000000000002Q6VF78)
    (err ERR-INVALID-PRINCIPAL)
    (ok true)
  )
)

(define-private (validate-dates (start uint) (end uint))
  (if (or (>= start end) (is-eq start u0) (is-eq end u0))
    (err ERR-INVALID-DATE)
    (ok true)
  )
)

(define-private (validate-duration (dur uint))
  (if (< dur MIN-DURATION)
    (err ERR-INVALID-DURATION)
    (ok true)
  )
)

(define-private (validate-status (stat (string-utf8 20)))
  (if (or (is-eq stat "") (> (len stat) u20))
    (err ERR-INVALID-STATUS)
    (ok true)
  )
)

(define-private (concat-details (intern principal) (company principal) (role (string-utf8 100)) (start uint) (end uint))
  (let
    (
      (intern-str (unwrap-panic (to-consensus-buff? intern)))
      (company-str (unwrap-panic (to-consensus-buff? company)))
      (start-str (int-to-ascii start))
      (end-str (int-to-ascii end))
      (step1 (unwrap-panic (as-max-len? (concat intern-str "|") u1024)))
      (step2 (unwrap-panic (as-max-len? (concat step1 company-str) u1024)))
      (step3 (unwrap-panic (as-max-len? (concat step2 "|") u1024)))
      (step4 (unwrap-panic (as-max-len? (concat step3 role) u1024)))
      (step5 (unwrap-panic (as-max-len? (concat step4 "|") u1024)))
      (step6 (unwrap-panic (as-max-len? (concat step5 start-str) u1024)))
      (step7 (unwrap-panic (as-max-len? (concat step6 "|") u1024)))
      (combined (unwrap-panic (as-max-len? (concat step7 end-str) u1024)))
    )
    (ok combined)
  )
)

(define-private (compute-hash (details (buff 1024)))
  (sha256 details)
)

;; Public Functions
(define-public (register-internship
  (company principal)
  (role (string-utf8 100))
  (start-date uint)
  (end-date uint)
  (skills (list 20 (string-utf8 50)))
  (description (string-utf8 500))
  (status (string-utf8 20))
  (company-name (string-utf8 100))
  (location (string-utf8 100))
  (contact-info (string-utf8 200))
  (achievements (list 10 (string-utf8 200)))
  (references (list 5 principal))
)
  (let
    (
      (intern tx-sender)
      (details (unwrap! (concat-details intern company role start-date end-date) (err ERR-INVALID-HASH)))
      (internship-hash (compute-hash details))
      (existing (map-get? internships {internship-hash: internship-hash}))
      (duration (- end-date start-date))
    )
    (try! (validate-principal intern))
    (try! (validate-principal company))
    (try! (validate-string role u100))
    (try! (validate-dates start-date end-date))
    (try! (validate-list-length skills MAX-LIST-LENGTH))
    (try! (validate-string description u500))
    (try! (validate-status status))
    (try! (validate-duration duration))
    (try! (validate-string company-name u100))
    (try! (validate-string location u100))
    (try! (validate-string contact-info u200))
    (try! (validate-list-length achievements u10))
    (map fold-validate-strings achievements (ok true))
    (map fold-validate-principals references (ok true))
    (if (is-some existing)
      (err ERR-ALREADY-REGISTERED)
      (begin
        (map-set internships
          {internship-hash: internship-hash}
          {
            intern: intern,
            company: company,
            role: role,
            start-date: start-date,
            end-date: end-date,
            skills: skills,
            description: description,
            status: status,
            duration: duration,
            company-name: company-name,
            location: location,
            contact-info: contact-info,
            achievements: achievements,
            references: references,
            registration-timestamp: block-height
          }
        )
        (map-set internship-owners
          {internship-hash: internship-hash}
          {owner: intern}
        )
        (print {event: "internship-registered", hash: internship-hash, intern: intern, company: company})
        (ok internship-hash)
      )
    )
  )
)

;; Read-Only Functions
(define-read-only (get-internship-details (internship-hash (buff 32)))
  (map-get? internships {internship-hash: internship-hash})
)

(define-read-only (get-internship-owner (internship-hash (buff 32)))
  (map-get? internship-owners {internship-hash: internship-hash})
)

(define-read-only (is-registered (internship-hash (buff 32)))
  (is-some (map-get? internships {internship-hash: internship-hash}))
)

(define-read-only (calculate-duration (start uint) (end uint))
  (if (> end start)
    (ok (- end start))
    (err ERR-INVALID-DATE)
  )
)

(define-read-only (get-registration-timestamp (internship-hash (buff 32)))
  (match (map-get? internships {internship-hash: internship-hash})
    some-entry (ok (get registration-timestamp some-entry))
    none (err ERR-NOT-AUTHORIZED)
  )
)

;; Helper Functions for Validation
(define-private (fold-validate-strings (item (string-utf8 200)) (acc (response bool uint)))
  (match acc
    ok-val (validate-string item u200)
    err-val acc
  )
)

(define-private (fold-validate-principals (item principal) (acc (response bool uint)))
  (match acc
    ok-val (validate-principal item)
    err-val acc
  )
)

;; Additional Read-Only Functions
(define-read-only (get-internship-skills (internship-hash (buff 32)))
  (match (map-get? internships {internship-hash: internship-hash})
    some-entry (ok (get skills some-entry))
    none (err ERR-NOT-AUTHORIZED)
  )
)

(define-read-only (get-internship-status (internship-hash (buff 32)))
  (match (map-get? internships {internship-hash: internship-hash})
    some-entry (ok (get status some-entry))
    none (err ERR-NOT-AUTHORIZED)
  )
)

(define-read-only (get-internship-duration (internship-hash (buff 32)))
  (match (map-get? internships {internship-hash: internship-hash})
    some-entry (ok (get duration some-entry))
    none (err ERR-NOT-AUTHORIZED)
  )
)

(define-read-only (get-internship-achievements (internship-hash (buff 32)))
  (match (map-get? internships {internship-hash: internship-hash})
    some-entry (ok (get achievements some-entry))
    none (err ERR-NOT-AUTHORIZED)
  )
)

(define-read-only (get-internship-references (internship-hash (buff 32)))
  (match (map-get? internships {internship-hash: internship-hash})
    some-entry (ok (get references some-entry))
    none (err ERR-NOT-AUTHORIZED)
  )
)

;; Public Function to Update Status
(define-public (update-status (internship-hash (buff 32)) (new-status (string-utf8 20)))
  (let
    (
      (owner (unwrap! (get owner (map-get? internship-owners {internship-hash: internship-hash})) (err ERR-NOT-AUTHORIZED)))
      (entry (unwrap! (map-get? internships {internship-hash: internship-hash}) (err ERR-NOT-AUTHORIZED)))
    )
    (if (is-eq tx-sender owner)
      (begin
        (try! (validate-status new-status))
        (map-set internships {internship-hash: internship-hash}
          (merge entry {status: new-status})
        )
        (print {event: "status-updated", hash: internship-hash, new-status: new-status})
        (ok true)
      )
      (err ERR-NOT-AUTHORIZED)
    )
  )
)

;; Public Function to Add Skill
(define-public (add-skill (internship-hash (buff 32)) (new-skill (string-utf8 50)))
  (let
    (
      (owner (unwrap! (get owner (map-get? internship-owners {internship-hash: internship-hash})) (err ERR-NOT-AUTHORIZED)))
      (entry (unwrap! (map-get? internships {internship-hash: internship-hash}) (err ERR-NOT-AUTHORIZED)))
      (current-skills (get skills entry))
    )
    (if (is-eq tx-sender owner)
      (if (< (len current-skills) MAX-LIST-LENGTH)
        (begin
          (try! (validate-string new-skill u50))
          (map-set internships {internship-hash: internship-hash}
            (merge entry {skills: (append current-skills new-skill)})
          )
          (print {event: "skill-added", hash: internship-hash, skill: new-skill})
          (ok true)
        )
        (err ERR-INVALID-SKILLS-LIST)
      )
      (err ERR-NOT-AUTHORIZED)
    )
  )
)

;; Public Function to Add Achievement
(define-public (add-achievement (internship-hash (buff 32)) (new-achievement (string-utf8 200)))
  (let
    (
      (owner (unwrap! (get owner (map-get? internship-owners {internship-hash: internship-hash})) (err ERR-NOT-AUTHORIZED)))
      (entry (unwrap! (map-get? internships {internship-hash: internship-hash}) (err ERR-NOT-AUTHORIZED)))
      (current-achievements (get achievements entry))
    )
    (if (is-eq tx-sender owner)
      (if (< (len current-achievements) u10)
        (begin
          (try! (validate-string new-achievement u200))
          (map-set internships {internship-hash: internship-hash}
            (merge entry {achievements: (append current-achievements new-achievement)})
          )
          (print {event: "achievement-added", hash: internship-hash, achievement: new-achievement})
          (ok true)
        )
        (err ERR-INVALID-ACHIEVEMENTS-LIST)
      )
      (err ERR-NOT-AUTHORIZED)
    )
  )
)

;; Public Function to Add Reference
(define-public (add-reference (internship-hash (buff 32)) (new-reference principal))
  (let
    (
      (owner (unwrap! (get owner (map-get? internship-owners {internship-hash: internship-hash})) (err ERR-NOT-AUTHORIZED)))
      (entry (unwrap! (map-get? internships {internship-hash: internship-hash}) (err ERR-NOT-AUTHORIZED)))
      (current-references (get references entry))
    )
    (if (is-eq tx-sender owner)
      (if (< (len current-references) u5)
        (begin
          (try! (validate-principal new-reference))
          (map-set internships {internship-hash: internship-hash}
            (merge entry {references: (append current-references new-reference)})
          )
          (print {event: "reference-added", hash: internship-hash, reference: new-reference})
          (ok true)
        )
        (err ERR-INVALID-REFERENCES-LIST)
      )
      (err ERR-NOT-AUTHORIZED)
    )
  )
)