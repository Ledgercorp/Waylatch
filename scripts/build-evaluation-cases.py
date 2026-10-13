#!/usr/bin/env python3
"""Freeze authored fictional cases; never imports or invokes a model.

Run from any directory. All scenario text below was constructed before new
evaluation predictions. The key records construction intent, not adjudication.
"""
from collections import Counter
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET_ID = "waylatch-fictional-purchase-pairs-v1"

# Twenty independently written procurement situations per family. Each line is:
# left description | right description | neutral scenario facts | author rationale
# Position controls evidence stress, not text generation. All natural-language
# descriptions and situation facts are authored here, not a word cross-product.
FAMILIES = []


def family(slug, split, rows):
    parsed = [line.split(" | ") for line in rows.strip().splitlines()]
    assert len(parsed) == 20, (slug, len(parsed))
    assert all(len(row) == 4 for row in parsed), slug
    FAMILIES.append((slug, split, parsed))


family("potable-water", "calibration", """
48 six-bottle packs of still water delivered to Elm reception | 48 six-bottle packs of still water delivered to Elm reception | Order ELM-417 supplied one pallet on Monday. Its signed delivery slip appears in the paper form and the offline tablet upload. | Both forms claim that one delivered pallet.
Refill the drinking-water tank beside the Birch registration tent | Potable tanker delivery for the registration point at Birch | Birch's tanker log lists one 800-litre fill under hire order BT-63. The volunteer called it a tank refill; the finance clerk used the tanker invoice wording. | Two wordings of the logged tanker fill.
Ten 19-litre drinking-water cooler bottles for Cedar hall | Ten five-gallon potable-water carboys for the Cedar dispensers | The supplier sells the same nominal 19-litre bottle as a five-gallon carboy. Both applications quote dispatch CD-29 and the same ten returnable containers. | Equivalent units and terms describe the same dispatch.
H2O: 24 x 1L, Maple triage desk, inv MP-108 | Twenty-four one-litre drinking-water bottles for the Maple intake desk, invoice MP-108 | MP-108 is a single sealed box collected by the triage runner. The second entry expands the runner's abbreviated note. | Abbreviations refer to the same box.
Drnking wter 30 botles for Oak volunteers; collect OW-77 | Drinking water, thirty bottles collected for the Oak volunteer station, OW-77 | Oak's pickup book has only collection OW-77 for this quantity. A rushed phone entry and the coordinator's transcription cite that collection. | Misspellings and transcription concern one pickup.
Water sachets for 200 people at Pine queue | Sealed drinking-water pouches for Pine's waiting line | The cashier's JPEG and the scanned PDF are different byte files of invoice PN-41. The allocation list says 200 people received its single batch of pouches. | Different file digests do not create a second purchase.
120 litres of bottled water for Willow hall, total including deposit | Drinking-water bottles for Willow; goods subtotal only | Supplier WL-22 issued one bill: goods 9,600 cents plus 1,200 cents bottle deposit. One requester entered 10,800 and the other entered 9,600 from that bill. | Amount disagreement is explained by the deposit on one procurement.
Emergency potable-water delivery to Ash annex, order AS-80 | Eight hundred litres for Ash's drinking tank, AS-80 | The paper intake form lacks amount and incident fields. The retained dispatch book nevertheless identifies AS-80 as the only tanker delivery to Ash that afternoon; both descriptions cite it. | Missing structured facts coexist with a known single delivery.
Invoice FW-31, sealed cups of water for Fir west wing | Sealed water cups, FW-31, transferred from Fir to Spruce | One paid carton consignment on FW-31 was redirected from Fir's incident allocation to Spruce before distribution. The two teams each submitted that supplier bill. | A reassignment of one consignment does not authorize a second claim.
Drinking-water bottles for Juniper shelter | Drinking-water bottles for Juniper shelter | Juniper's signed records show two independent 60-bottle orders, JU-101 for Tuesday and JU-102 for Wednesday, each delivered and paid separately. The forms use the same brief description. | Identical wording covers two legitimate replenishments.
40 bottled-water packs for Larch's east desk, LE-5 | 40 bottled-water packs for Larch's west desk, LW-6 | The same incident coordinator authorized separate desk stocks. Distinct supplier orders LE-5 and LW-6 have separate deliveries and recipients. | Same incident and product do not merge the two orders.
Drinking-water tanker for Hazel field kitchen, HZ-10 | Drinking-water dispenser rental for Hazel hall, HZ-11 | The tanker fill and the dispenser hire each cost 18,000 cents. HZ-10 and HZ-11 were independently ordered from different businesses and fulfilled. | Coincident amounts cover distinct goods and services.
Clearwater bottled mineral water for the Poplar queue | Clearwater collection of empty returnable water bottles | Clearwater's delivery invoice CW-91 bills fresh drinking water. CW-92 separately bills a later empty-container collection service; both jobs were authorized. | Shared vendor and water terms conceal a delivery versus a return service.
Six 20-litre sealed drinking-water containers, Rowan store | Six empty 20-litre reusable drinking-water containers, Rowan store | RW-18 supplies filled disposable containers for consumption. RW-19 supplies empty reusable containers for future refills. Both orders were delivered to the same store. | Filled drinking supply and empty vessels are separate purchases.
Daily potable-water delivery to Yew, Monday service | Daily potable-water delivery to Yew, Thursday service | A standing contract authorizes a separately billed fill each service day. The Monday and Thursday logs show different tanker visits, meter readings, and invoice lines. | Repeated legitimate service is not one original fill.
Rose shelter drinking-water bottle order RS-12 | Rose shelter drinking-water bottle order RS-13 | Receipts RS-12 and RS-13 list separate purchases: one for 36 small bottles and one for 18 large bottles. Both are supported by independent pickup signatures. | Different receipts corroborate two purchases.
Potable water picked up for Alder site, order AL-7 | Potable water picked up for Alder site, order AL-8 | Both forms omit receipt files and amounts. Alder's supplier ledger records two separate cash collections under AL-7 and AL-8, with different stock quantities. | Missing attachments do not erase independent order identities.
Water cartons from invoice HH-4, delivery line A | Water cartons from invoice HH-4, delivery line B | HH-4 is a consolidated bill for two independently ordered deliveries to Holly. The supplier marks line A as order HO-4 and line B as order HO-5; neither request claims the other line. | Sharing an invoice file does not make separate authorized line purchases duplicates.
Sealed drinking-water shipment DS-15 for Dogwood shelter | Dogwood water cartons DS-15, delayed offline entry | The consignment DS-15 arrived once on 3 April. A damaged tablet synchronized its form eleven days after the paper entry, with no second supplier shipment. | Delayed recording still claims the original consignment.
Drinking-water top-up for Beech reception | Additional drinking water for Beech reception | Two unsigned notes mention water for Beech but carry no quantities, supplier orders, receipt files, transaction references, or delivery dates. The site could have needed a second top-up; no fulfillment record survives. | Available facts cannot establish one purchase or two.
""")

family("batteries-lighting", "calibration", """
Twelve packs of AAA batteries for Finch inspection torches | Twelve packs of AAA batteries for Finch inspection torches | Store issue FC-11 is one paid battery pickup. The identical form was typed into the portal after the runner had already queued it offline. | One pickup has two submissions.
Replace the rechargeable cells in Heron search lights | Spare power cells for the Heron team's handheld inspection lamps | Both requests cite the four-cell replacement kit on HER-28. Heron's equipment log records those four cells fitted to the lamps in one repair session. | Paraphrase describes the same replacement kit.
Six lithium button cells for Wren thermometers, CR2032 | Six coin batteries, type 2032, for Wren temperature probes | WR-9 lists six CR2032 lithium cells. The requester and technician use the supplier and workshop names for those same parts. | Coin and button terminology names one procurement.
AA batt pk x8, Robin torch locker, RB-72 | Eight packs of double-A batteries for Robin's flashlight locker, RB-72 | RB-72 is the single locker restock recorded on the checkout sheet. The assistant expands the abbreviated handwritten request. | Short and expanded wording refer to one restock.
Rechargble torch batery pair Kestrel KS-6 | Pair of rechargeable flashlight batteries for Kestrel, KS-6 | The misspelled mobile form and cleaned transcription both attach to the two serial-numbered cells on KS-6. No other pair was bought. | Typo variation preserves the original pair.
Battery charger with four cells for Osprey workshop | Osprey rechargeable-cell starter kit | OS-88 contains one charger bundle. A cropped phone image of the receipt and a supplier PDF have distinct digests but the same invoice number and bundle serial. | Two receipt representations concern one kit.
Eagle portable lamp battery, full amount on EG-2 | Replacement battery for Eagle lamp, discounted amount | EG-2 is one sale with a 1,000-cent voucher. One form records 7,500 cents before the voucher; the other records the actual 6,500-cent payment. | Price entries disagree about one sale's discount.
Torch batteries for Dove inspection crew, DV-50 | Dove flashlight cells, collect DV-50 | One request has no amount or receipt attachment. Both notes cite pickup DV-50, which the supplier and crew supervisor record as a single pack collection. | An incomplete form still identifies the same pickup.
Nightjar battery shipment NJ-18 for initial survey | NJ-18 spare cells allocated to the recovery survey | The one NJ-18 stock purchase was reassigned to a recovery incident after the initial survey closed. Finance received a form from each survey lead for that same stock. | Separate incident allocations do not imply separate stock purchases.
Torch battery restock for Swift base | Torch battery restock for Swift base | SW-41 and SW-42 are independent weekly restocks. Their separate pickup slips show fresh packs issued after the previous stock was consumed. | Same text covers distinct scheduled purchases.
Two lamp batteries for Raven crew one, RV-31 | Two lamp batteries for Raven crew two, RV-32 | The Raven incident authorized separate replacement pairs for separate teams. RV-31 and RV-32 have different battery serials and signed receipts. | The shared incident contains two legitimate pairs.
Sparrow disposable D cells, SP-10 | Sparrow mains-powered torch charging dock, SP-11 | Each item costs 4,800 cents, but SP-10 is a cell pack and SP-11 is a separately purchased charging dock. Both were received. | Equal amounts do not equate the different items.
Lighting battery packs for Martin tunnel team | Battery recycling collection from Martin tunnel team | MT-30 delivers new packs. MT-31 pays a recycler to remove spent cells the following day. The two services have separate orders. | Similar lighting and battery words describe supply and disposal.
Rechargeable AA cells for Kite equipment cabinet | Non-rechargeable AA cells for Kite equipment cabinet | KT-14 supplies rechargeables for lamps; KT-15 supplies disposable alkalines for instruments whose manuals prohibit rechargeable cells. Both are independently approved. | Closely related battery types fulfill separate requirements.
First set of headlamp cells for Tern shift | Replacement set of headlamp cells for Tern shift | A damaged headlamp drained its first set. The foreman signed a later purchase TR-8 after the independently paid first set TR-7 had been fitted and consumed. | A justified replacement is a new purchase.
Kingfisher lamp battery purchase KF-21 | Kingfisher lamp battery purchase KF-22 | KF-21 and KF-22 carry different supplier receipt numbers and battery serials; the crew book documents two damaged lamps receiving separate new batteries. | Separate receipts and serials establish separate purchases.
Replacement torch cells for Skylark locker SL-3 | Replacement torch cells for Skylark locker SL-4 | Receipt files and transaction fields are absent. A signed stock sheet lists distinct purchases SL-3 and SL-4 on different dates with separate pack counts. | External stock records establish two purchases despite missing fields.
Owl battery multipack invoice OWL-2, order A | Owl battery multipack invoice OWL-2, order B | The supplier combined two separately authorized team orders on OWL-2. Each request claims only its own multipack invoice line and team order, with no overlap. | One consolidated invoice contains two independent purchases.
Plover lithium torch pack PL-80, original entry | Plover lithium torch pack PL-80, archive import | PL-80 was bought once. A migration created a second request four weeks later from the original paper receipt; the equipment log shows no subsequent pack delivery. | An archive import repeats the original purchase.
Torch-cell replacement for Gull rescue van | Battery pack for Gull rescue van | Two incomplete entries have no pack size, supplier identity, order number, serials, or receipt. The van uses several kinds of cells, and no stock log links the entries. | One pack versus separate packs remains unresolved.
""")

family("medical-dressings", "calibration", """
Twenty sterile gauze packets for Linden dressing station | Twenty sterile gauze packets for Linden dressing station | Delivery LD-55 supplied twenty packets once. A nurse's queued form and the coordinator's portal form both include that signed consignment. | The delivery was claimed twice.
Refill Aspen's wound-care tray with adhesive strips and gauze | Dressing materials to replenish Aspen's minor-injury treatment tray | Invoice AP-13 bills one tray refill. The supply nurse and administrator described the same refill according to clinical use and purchasing category. | Two descriptions of one refill.
Ten non-adherent wound pads for Laurel clinic | Ten low-adherence dressings for Laurel treatment desk | LA-24 supplies one pack of ten pads. The product sheet calls them non-adherent wound pads; the clinic calls those same pads low-adherence dressings. | Equivalent terminology concerns the same pack.
Ster drsg 10cm x10, Olive post, OL-7 | Ten sterile ten-centimetre dressings for Olive treatment post, OL-7 | The abbreviated clinical note refers to the single ten-pack on OL-7. The second form transcribes its dimensions and count in full. | Abbreviated and full clinical wording identify one pack.
Adhesve bandges for Magnolia clinc MG-14 | Adhesive bandages for Magnolia clinic, MG-14 | MG-14 was one boxed assortment collected by the nurse. Both the rushed spelling and corrected note name that pickup. | Correcting spelling does not establish a second purchase.
Sterile dressing rolls for Sycamore treatment point | Sycamore wound-dressing roll order | SY-20 is one delivered order. A scanner-produced image and a PDF export of its paper receipt have different hashes, but both retain SY-20 and the delivery signature. | File transformations do not change the purchase identity.
Sequoia gauze order SQ-2, invoice total | Gauze for Sequoia, SQ-2, net goods charge | SQ-2 has a 3,000-cent goods subtotal and 300 cents tax. One form asks for the gross bill and one mistakenly asks for its subtotal. No second gauze sale occurred. | Conflicting gross and net amounts refer to one sale.
Wound pads for Cypress clinic, CP-41 | Cypress sterile pads, CP-41 | The field tablet lost amount and receipt metadata. The retained clinical supply register lists CP-41 once, with its single delivery and both request authors signing receipt of that box. | Missing fields do not obscure the documented box identity.
Chestnut wound-tape purchase CH-18 for intake clinic | CH-18 medical adhesive tape moved to recovery clinic | The clinic transfer register moves the same unopened CH-18 tape box between incident budgets. Each budget holder submitted the original supplier invoice. | A clinic transfer does not create another purchase.
Sterile dressings for Hawthorn station | Sterile dressings for Hawthorn station | HT-60 and HT-61 are separate replenishments after two treatment sessions. Each receipt covers a new delivered box, though both forms use identical text. | Repeated text belongs to distinct purchases.
Gauze packs for Acacia mobile clinic A, AC-3 | Gauze packs for Acacia mobile clinic B, AC-4 | The Acacia incident opened two clinics. AC-3 and AC-4 are separately authorized, paid, and delivered stocks assigned to different clinic vans. | Same incident includes two independent clinic orders.
Adhesive dressings for Camellia clinic, CM-1 | Dressing scissors for Camellia clinic, CM-2 | Both purchases cost 2,600 cents. CM-1 supplies consumable strips; CM-2 supplies a separately ordered pair of clinical scissors. | Equal price does not merge consumables and an instrument.
Sterile gauze dressings for Iris first-response desk | Dressing-table protective liners for Iris first-response desk | IR-11 lists clinical gauze; IR-12 lists disposable table liners for the workspace. They were separately purchased and stored on different inventory lines. | Shared dressing vocabulary masks different products.
Sterile wound pads for Azalea treatment room | Non-sterile gauze for Azalea demonstration class | AZ-9 supplies sterile pads for patients; AZ-10 supplies teaching gauze for mannequin practice. The educator and clinic nurse each received their distinct order. | Similar supplies have independently fulfilled purposes.
Initial dressing-kit refill for Dahlia clinic, DH-6 | Second dressing-kit refill for Dahlia clinic, DH-7 | DH-6 was used during a morning casualty intake. The stock ledger supports a separately paid evening refill DH-7 after those contents were exhausted. | Consumption followed by restocking is a legitimate new purchase.
Wound tape and gauze, Gardenia order GD-8 | Wound tape and gauze, Gardenia order GD-9 | GD-8 and GD-9 have distinct invoice numbers, pickup signatures, and quantities. One supplies the mobile team and the other supplies the fixed treatment room. | Different receipts document independent stocks.
Marigold dressing pack collected on MG-31 | Marigold dressing pack collected on MG-32 | Both entries lack scanned receipts and amounts. Signed pharmacy slips distinguish MG-31 and MG-32 as two paid collections for separate kits. | Documentary collection identities establish separate purchases.
Jasmine dressing order JA-1, consolidated receipt JS-4 | Jasmine dressing order JA-2, consolidated receipt JS-4 | JS-4 contains two independently ordered items, JA-1 for the walk-in clinic and JA-2 for the mobile clinic. Each reimbursement claim covers its own line only. | Shared receipt bytes encompass two separate purchases.
Peony wound pads PY-77, nurse's purchase form | Peony wound pads PY-77, finance reconstruction | PY-77 was delivered once. Finance reconstructed the nurse's misplaced form two weeks later; the warehouse log still has one delivery for PY-77. | Later reconstruction duplicates the original procurement.
Dressing supplies for Poppy treatment tent | Medical pads for Poppy treatment tent | The two unsigned entries lack item counts, dates of supply, order references, and receipts. Several clinics drew supplies from the tent, and no stock allocation record connects the notes. | The original purchase identity is genuinely undetermined.
""")

family("generator-fuel", "calibration", """
60 litres of diesel for Harbor generator, HG-44 | 60 litres of diesel for Harbor generator, HG-44 | HG-44 is one metered delivery logged against the generator tank. Its invoice entered through a driver form and a dispatcher form. | Both forms claim the same metered delivery.
Refuel the Marina site's standby diesel engine | Diesel delivery for Marina's emergency electricity set | MAR-12 is the sole fuel drop on the engine log that day. The site calls the machine a standby engine; purchasing calls it an electricity set. | Different machine wording refers to the same fuel drop.
Gas oil for Cove temporary generating set, CV-5 | Red diesel for Cove's temporary generator, CV-5 | The supplier invoice uses gas oil and the mechanic uses red diesel for the same permitted product and single metered delivery CV-5. | Regional product terms name one supply.
DERV 80L gen Pier, PR-9 | Eighty litres of road diesel for Pier generator, PR-9 | The handwritten DERV note is expanded on the coordinator form. Both cite the 80-litre fuel collection PR-9 in the operator's log. | Abbreviated fuel terminology refers to one collection.
Deisel for Quay genrator QY-8 | Diesel for Quay generator, QY-8 | QY-8 identifies one canister collection. The two forms differ only because the mobile typist misspelled the fuel and equipment names. | Typo correction repeats the same collection.
Diesel tanker top-up for Dock emergency power | Dock generator tank diesel refill | DK-61 is one tanker visit. The delivery driver's thermal receipt photo and finance's invoice scan differ in digest but carry DK-61 and the same meter reading. | Distinct receipt images document the same visit.
Jetty diesel refill JY-3, bill with delivery fee | Jetty generator diesel JY-3, fuel cost only | JY-3 bills 14,000 cents fuel and a 2,000-cent delivery fee. The fuel-only form omits that fee from a second claim against the same delivery. | Amount conflict concerns components of one bill.
Wharf generator diesel, collect WF-19 | WF-19 fuel for Wharf power set | One entry has no incident or receipt file. Both name WF-19; the depot pickup register shows one batch collected by the Wharf operator. | Known collection identity survives missing metadata.
Breakwater diesel BW-55 for response generator | BW-55 diesel moved to recovery power unit | The fuel purchased on BW-55 was moved to the recovery generator before use. The response and recovery managers each entered the original bill under their incident codes. | Moving previously bought fuel does not create another purchase.
Diesel top-up for Inlet generator | Diesel top-up for Inlet generator | IN-41 and IN-42 are two separately metered and invoiced top-ups after consecutive days of operation. The requester reused the same description. | Repeated operation required two independent supplies.
Fuel for Basin generator north, BN-6 | Fuel for Basin generator south, BS-7 | The Basin incident uses two power units. BN-6 and BS-7 have separate tank readings, delivery tickets, and payments. | One incident legitimately contains two generator fuel purchases.
Diesel delivery for Estuary generator, ES-4 | Generator oil service for Estuary, ES-5 | ES-4 buys diesel and ES-5 pays a separately ordered oil-change service. Both invoices total 9,000 cents and were fulfilled by different suppliers. | Equal amounts accompany different procurements.
Diesel fuel for Strait generator | Generator fuel-tank cleaning at Strait | ST-20 is a fuel supply. ST-21 is an independently authorized tank-cleaning job carried out before another fuel delivery. | Fuel supply and tank maintenance are distinct despite shared words.
Diesel for Delta generator D1 | Petrol for Delta generator D2 | Delta operates a diesel unit and a petrol unit. DL-11 and DL-12 deliver the correct separate fuels to those distinct machines on the same afternoon. | Similar purpose does not equate fuels or machines.
First diesel canister for Reach generator RC-8 | Replacement diesel canister for Reach generator RC-9 | RC-8's fuel was consumed during a long outage. RC-9 is a separately bought refill documented by a new pump receipt and operator log entry. | Consumption separates the original and replacement supply.
Channel generator diesel CHN-31 | Channel generator diesel CHN-32 | CHN-31 and CHN-32 list distinct metered quantities and separate delivery dates. Both delivery signatures are valid and cover independently purchased fuel. | Different receipts corroborate separate fuel purchases.
Sound power-unit diesel, depot order SD-5 | Sound power-unit diesel, depot order SD-6 | Scanned receipts and amounts are missing. The depot statement records SD-5 and SD-6 as separate paid collections with different vehicle pickup times. | Separate depot orders remain identifiable without attachments.
Diesel consignment Lagoon LG-1 on invoice LX-4 | Diesel consignment Lagoon LG-2 on invoice LX-4 | LX-4 combines independently authorized consignments LG-1 and LG-2 to two machines. The requests claim their own delivered quantities rather than the whole invoice. | Shared consolidated receipt is not overlapping procurement.
Peninsula diesel ticket PS-18, original request | Peninsula diesel ticket PS-18, late offline upload | PS-18 represents one 90-litre delivery. An offline request appeared nine days after the paper request; no second fuel delivery is logged for PS-18. | Timing difference does not change the original fuel identity.
Fuel for Bay generator | Generator diesel for Bay site | Both entries omit litres, supplier, machine number, order reference, and receipt. Bay operated several generators and the incomplete shift logs do not establish how many supplies occurred. | Insufficient facts leave one delivery versus two unresolved.
""")

family("sanitation-hygiene", "heldout", """
Four toilet cubicles hired for Copper camp, hire CC-9 | Four toilet cubicles hired for Copper camp, hire CC-9 | Hire CC-9 supplied four numbered cubicles for one weekend. The camp lead's form and the contractor liaison's form both claim that hire period. | One equipment hire has two submissions.
Empty the waste tanks under Tin camp's portable toilets | Pump-out service for Tin's temporary latrine tanks | The sanitation contractor's log records one visit, job TN-14. The camp coordinator and waste officer each described its single tank-emptying service. | Different wording describes the same contractor visit.
Handwashing soap bars for Nickel dormitory | Solid hand soap for Nickel accommodation washrooms | NI-61 lists one carton of sixty soap bars. The dormitory uses accommodation as its procurement name; both forms refer to that carton and delivery slip. | Equivalent product and location terms describe one carton.
WC hire 3 units, Zinc yard, ZN-7 | Hire of three portable toilets for Zinc yard, ZN-7 | ZN-7 is the signed contract for three cubicles. The second form expands the foreman's WC abbreviation and repeats the same hire dates. | Abbreviation refers to the same hire.
Toilt roll restok for Cobalt camp CB-4 | Toilet roll restock for Cobalt camp, CB-4 | CB-4 supplied one case of forty-eight rolls. The storekeeper's typo-filled entry and the checked version both cite the same stock arrival. | Correcting typos repeats one stock purchase.
Portable toilet cleaning at Iron camp | Iron temporary latrine cleaning service | Cleaning job IRN-25 was performed once. The contractor emailed a PDF and the caretaker photographed the signed job sheet; both identify the same visit despite different file hashes. | Different documents support one cleaning service.
Aluminium camp washroom hire, invoice total | Washroom hire at Aluminium camp, hire charge only | ALU-18 covers one hire at 24,000 cents plus a 3,000-cent collection fee. The two requesters entered gross and hire-only amounts from that same contract. | A fee omission is an amount conflict within one hire.
Hand-soap refill for Silver wash station, SLV-8 | Soap refill delivery SLV-8 to Silver camp | One entry omits incident and amount. The store ledger identifies SLV-8 as one delivered refill batch, and both authors signed that batch's intake sheet. | Missing metadata still leaves one known delivery.
Gold camp toilet hire GDH-2 for intake area | GDH-2 cubicles relocated to Gold recovery area | The same hired cubicles moved between incident areas under an unchanged GDH-2 contract. Each area lead submitted the contractor's original hire bill. | Relocation does not create a second hire contract.
Soap supplies for Platinum camp | Soap supplies for Platinum camp | PT-11 and PT-12 are separately paid weekly cartons. Their delivery signatures and stock depletion records support two replenishments although the descriptions are identical. | Repeated wording covers distinct supplies.
Toilet hire for Brass camp east, BE-3 | Toilet hire for Brass camp west, BW-4 | The Brass incident hired separate numbered cubicles for opposite sides of camp. BE-3 and BW-4 are independently authorized contracts with separate placement records. | Same incident includes separate toilet hires.
Nickelvale camp soap refill, NV-1 | Nickelvale camp sanitary-bin rental, NV-2 | The refill and bin rental each cost 7,200 cents. NV-1 supplies soap; NV-2 rents separately installed bins from another contractor. | Same amount belongs to different procurement purposes.
Washroom cleaning supplies for Bronze camp | Washroom cleaning inspection for Bronze camp | BR-30 buys brushes and detergent. BR-31 pays a separately booked inspection of the contractor's cleaning standard, with a signed report and no supplied materials. | Shared cleaning terms do not equate materials and inspection.
Paper toilet rolls for Pewter dormitory | Paper hand-drying rolls for Pewter dormitory | PW-2 supplies toilet rolls and PW-3 supplies dispenser hand towels. Each fits a different fixture and was independently ordered and delivered. | Similar paper rolls fulfill different fixture needs.
Septic-tank emptying for Steel camp on Monday | Septic-tank emptying for Steel camp on Friday | The contractor's logs show the tank refilled through four days of use. Separate visits STC-5 and STC-6 were authorized, completed, and separately invoiced. | Recurring sanitation visits are distinct fulfilled jobs.
Cleaning detergent for Chromium toilets, CR-11 | Cleaning detergent for Chromium toilets, CR-12 | CR-11 supplied ten litres and CR-12 supplied twenty litres after expansion. Distinct receipts and store signatures document independently purchased batches. | Different receipts corroborate separate batches.
Disposable washcloths for Manganese wash area, MN-4 | Disposable washcloths for Manganese wash area, MN-5 | Neither entry retains a receipt file or amount. The requisition ledger distinguishes MN-4 and MN-5 as purchases for separately stocked wash stations. | Separate requisitions establish two purchases despite missing attachments.
Toilet servicing order Mercury ME-1 on statement MS-6 | Toilet servicing order Mercury ME-2 on statement MS-6 | MS-6 combines two separately commissioned services for different toilet blocks. Each request claims only the service under its own order and completion certificate. | A common statement contains separate sanitation jobs.
Soap carton delivered to Titanium on TT-19 | Titanium soap carton TT-19, deferred synchronization | TT-19 arrived once before the camp network failed. The second form synchronized twelve days later from that delivery's original intake record. | Deferred entry repeats the original carton.
Washroom supplies for Antimony camp | Hygiene restock for Antimony camp | Two unsigned notes have no product lists, supplier references, amounts, or receipt files. The camp had several washrooms and the stock book for the week is missing. | The notes do not establish one supply or independent restocks.
""")

family("infant-feeding", "heldout", """
Eight tins of infant formula for Amber family room, AM-6 | Eight tins of infant formula for Amber family room, AM-6 | AM-6 delivered eight sealed tins once. A family-room lead and a purchasing assistant both entered the same till receipt after that pickup. | The one formula pickup is claimed twice.
Ready-to-use formula cartons for Jasper's infant care desk | Premixed infant milk feeds for babies at Jasper desk | JP-14 supplies one case of ready-to-feed formula. Both applicants refer to its same carton count, batch code, and family-room delivery signature. | Paraphrase concerns the same case.
Infant feeding teats for Topaz family station | Replacement baby-bottle nipples for Topaz station | TP-22 lists twelve silicone teats, also sold as bottle nipples. Both descriptions cite the same supplier product code and single delivered pack. | Equivalent regional product terms identify one pack.
RTF formula 12 x 200ml, Opal room, OP-3 | Twelve 200-millilitre ready-to-feed infant formula cartons, Opal room, OP-3 | The family worker abbreviates ready-to-feed as RTF. The coordinator expands that note from the sole OP-3 receipt and pickup signature. | The acronym and full wording claim one formula purchase.
Infnt botle brushs for Ruby desk RBM-8 | Infant bottle brushes for Ruby care desk, RBM-8 | RBM-8 covers one bag of six brushes. The misspelled queued request and corrected office transcription both identify that bag. | Typo correction preserves one procurement.
Sterilizing tablets for Sapphire feeding room | Sapphire infant-bottle sterilization tablet supply | SA-40 is one tablet box sale. The tablet receipt photographed under room lighting and the supplier's electronic duplicate differ in bytes but share SA-40 and its product batch. | Two receipt versions concern one box.
Emerald formula case EM-7, delivery included | Formula for Emerald family room, EM-7, carton price | EM-7 bills 11,600 cents for formula plus 1,400 cents delivery. One form enters 13,000 and the other enters 11,600 for the same case arrival. | Amount discrepancy reflects one delivery fee.
Bottle teats for Garnet desk, collection GN-2 | GN-2 replacement nipples for Garnet infant bottles | Amount and receipt metadata are missing on one form. The feeding desk's signed inventory receipt nevertheless records GN-2 as its one delivered teat pack. | Incomplete structured fields still identify one collection.
Quartz infant formula QZ-9 allocated to intake families | QZ-9 infant formula transferred to relocation families | The stock transfer sheet reallocates the same eight tins from one incident budget to another without a new sale. Both family teams submitted QZ-9's original supplier bill. | Reallocation does not justify another original-purchase claim.
Baby formula tins for Onyx family room | Baby formula tins for Onyx family room | ON-10 and ON-11 supplied separately paid tins in successive weeks. The consumption sheet shows the first stock used before the second arrived. | Identical descriptions conceal legitimate separate replenishment.
Bottle brushes for Jade desk north, JD-5 | Bottle brushes for Jade desk south, JD-6 | One incident opened two family desks. JD-5 and JD-6 are separate supplier orders with separate pickup signatures and allocations. | Shared incident does not merge two desk purchases.
Formula case for Pearl family support, PLF-1 | Infant feeding cup set for Pearl, PLF-2 | PLF-1 buys formula and PLF-2 buys reusable feeding cups; each separately delivered order costs 5,600 cents. | Equal cost does not make different feeding supplies one purchase.
Baby milk formula for Coral family room | Milk-formula preparation training for Coral carers | CO-18 delivers formula tins. CO-19 pays a separately booked workshop teaching safe preparation, supported by attendance and an instructor invoice. | Shared formula terms describe goods and an independent service.
Stage-one infant formula for Agate intake desk | Stage-two follow-on formula for Agate intake desk | AG-4 and AG-5 are independently approved products for different eligible age groups. Separate batch records and delivered tin counts support both. | Similar formula products are distinct age-specific purchases.
First bottle-sterilizing tablet box for Beryl room | Second bottle-sterilizing tablet box for Beryl room | BY-20 supplied the first week's stock and BY-21 replenished it after recorded use. Each sale has a separate batch number and paid receipt. | Consumed stock followed by a refill is a separate purchase.
Baby feeding spoons for Citrine station, CT-3 | Baby feeding spoons for Citrine station, CT-4 | CT-3 supplied silicone spoons for infants and CT-4 supplied training spoons for toddlers. Separate receipts and inventory lines identify two purchases. | Distinct receipts corroborate distinct item orders.
Infant cup purchase for Spinel desk SPN-6 | Infant cup purchase for Spinel desk SPN-7 | The forms lack amounts and attachments. The vendor's retained sales book distinguishes SPN-6 and SPN-7 as separate collected packs for two outreach teams. | Missing uploads do not erase independent sales.
Turquoise formula order TQ-1 on invoice TQS-8 | Turquoise formula order TQ-2 on invoice TQS-8 | TQS-8 combines orders for two separately stocked family rooms. Each request claims only the tins assigned to its original order; both room deliveries are signed. | One invoice groups independent non-overlapping purchases.
Moonstone feeding bottles MSF-31, initial entry | Moonstone feeding bottles MSF-31, late paper capture | MSF-31 delivered one bottle set. Three weeks later an archive clerk captured the already-entered paper form; the stock sheet lists no second set. | Late capture repeats the original set purchase.
Infant formula for Lapis family desk | Formula restock for Lapis care room | Both entries lack brand, stage, quantity, order identity, receipts, and dates of supply. The room serves multiple infants and no distribution log links the requests. | Available facts cannot determine whether a restock was separate.
""")

family("radio-communications", "heldout", """
Six VHF handheld radios hired for Badger coordination, BG-4 | Six VHF handheld radios hired for Badger coordination, BG-4 | BG-4 rents six serial-numbered radios for one three-day period. The logistics lead and radio officer each entered that same contract. | The same radio hire was submitted twice.
Two-way handset rental for Otter field marshals | Portable walkie-talkies hired for Otter's marshaling crew | OT-7 is one rental of four radios. Both forms reference the same serial list and signed issue sheet, using different common radio names. | Paraphrase describes one four-radio rental.
UHF aerials for Fox handheld sets | Ultra-high-frequency antennas for Fox portable radios | FX-18 supplies one bag of five antennas. Aerial and antenna are alternate terms on the product card, and both requests cite FX-18's delivery. | Equivalent terminology describes the same accessory pack.
PTT mics x3, Hare control, HR-8 | Three push-to-talk microphones for Hare control radios, HR-8 | HR-8 is the sole three-microphone order. The radio technician's acronym is expanded on the finance form from the same invoice. | Acronym expansion refers to one purchase.
Walkie talky earpeices for Lynx team LX-2 | Walkie-talkie earpieces for Lynx team, LX-2 | LX-2 delivered one pack of six earpieces. The hurried handset entry and corrected coordinator version both reference that pack. | Typo variation does not create a second pack purchase.
Radio repeater hire for Wolf ridge | Wolf temporary communications repeater rental | WF-R9 hired one repeater serial RP-409. A scanned signed rental agreement and a supplier-generated PDF have different digests but identify that unit and hire term. | Different document encodings concern the same hire.
Vole radio rental VL-6 including return courier | Handheld radio hire for Vole, VL-6, rental subtotal | VL-6 bills 16,000 cents rental and 2,400 cents courier. The forms differ because one excludes the courier from its entered amount. There is one rental agreement. | Amount conflict is within one radio rental.
Radio speaker microphones for Mole team, ML-30 | ML-30 shoulder microphones for Mole handsets | One submission lacks its amount and incident. The equipment intake sheet identifies ML-30 as the single purchased microphone set, signed by both requesters. | Missing fields still leave one procurement identity.
Stoat radios ST-11 assigned to search command | ST-11 radios reassigned to recovery command | The same purchased radio set was transferred between incident allocations. Both teams later requested reimbursement for the ST-11 supplier invoice; no second set was delivered. | Incident reassignment does not create a new radio purchase.
Handheld-radio hire for Ferret site | Handheld-radio hire for Ferret site | FR-21 hired units for a Monday exercise and FR-22 hired units for a Friday deployment. Separate contracts, hire periods, and return signatures support both. | Identical text refers to separately fulfilled hires.
Radio antenna kit for Beaver east team, BV-1 | Radio antenna kit for Beaver west team, BV-2 | The Beaver incident equips two separate teams. BV-1 and BV-2 are independently ordered kits with separate deliveries and installation records. | Same incident contains two legitimate kit purchases.
Radio handset rental for Mink crew, MK-3 | Printed radio-channel cards for Mink crew, MK-4 | MK-3 rents handsets and MK-4 buys laminated channel cards. Each independently fulfilled order costs 3,200 cents. | Equal amount does not equate a rental and printed goods.
Radio mast hire for Marten command | Radio mast safety inspection for Marten command | MT-R4 rents the temporary mast. MT-R5 pays a separately appointed inspector who checked the erected mast and issued a report. | Shared mast words describe independent hire and inspection purchases.
VHF radios for Sable marine scouts | UHF radios for Sable indoor marshals | SB-10 and SB-11 buy different-band radio sets for teams with incompatible systems. Separate serial inventories and approvals support both orders. | Related handset products are separate purchases.
Initial repeater rental for Ermine ridge | Renewed repeater rental for Ermine ridge | ER-5 covered days one to three. A separately signed extension ER-6 pays for days four to six after the original hire term, with no overlapping days claimed. | A separately authorized later rental period is a legitimate new service.
Radio earpiece order for Muskrat MR-1 | Radio earpiece order for Muskrat MR-2 | MR-1 and MR-2 are separate receipts for different connector types. The store and fitting sheets show each order supplied a different radio fleet. | Different receipts corroborate separately required accessories.
Handset belt clips for Hedgehog, HH-R8 | Handset belt clips for Hedgehog, HH-R9 | Receipt images and amount fields are absent. The supplier's dispatch ledger records two separately paid clip packs under HH-R8 and HH-R9 for distinct radio units. | Missing uploads coexist with two documented pack orders.
Dormouse radio hire order DM-1 on statement DS-R2 | Dormouse radio hire order DM-2 on statement DS-R2 | DS-R2 combines independently contracted radios for two teams. Each request claims only its own units and rental period; the serial sets are disjoint. | Shared statement contains distinct radio hire purchases.
Weasel antenna pack WS-77, technician entry | Weasel antenna pack WS-77, delayed office entry | WS-77 was received once. An office clerk entered its paper form fifteen days after the technician's synced form, with no new supplier dispatch. | Delayed entry repeats the original accessory purchase.
Radio equipment for Panda control post | Portable communications kit for Panda control post | The two notes omit radio counts, serials, hire terms, supplier references, and receipts. Panda used borrowed and rented equipment, and the issue register is unavailable. | There is no basis to resolve one kit versus separate purchases.
""")

family("shelter-structures", "heldout", """
Two canvas reception tents hired for Falcon yard, FY-6 | Two canvas reception tents hired for Falcon yard, FY-6 | FY-6 hired two numbered tents for one week. The yard supervisor and accommodation lead independently entered the identical contract bill. | Both entries claim the same two-tent hire.
Weather canopy over Crane's registration queue | Temporary rain shelter hired for Crane intake line | CR-S8 rents one canopy installed over the registration line. Both descriptions concern its same installation location, contractor order, and hire period. | Different wording identifies the same canopy rental.
Guy ropes for Eaglefield shelter tents | Tent guy lines for Eaglefield temporary shelters | EF-12 supplies one ten-line pack. The supplier calls them guy ropes and the assembly crew calls those same tension lines guy lines. | Equivalent terminology names one rope pack.
PE tarp 6x8m x2, Pelican yard, PL-S4 | Two six-by-eight-metre polyethylene tarpaulins for Pelican yard, PL-S4 | PL-S4 is the one two-sheet sale. The foreman's abbreviation is expanded using its invoice dimensions and material specification. | Abbreviation and expansion refer to one tarp purchase.
Tent peg replcement for Ibis camp IB-S3 | Tent peg replacement for Ibis camp, IB-S3 | IB-S3 supplied one pack of steel pegs. The queued misspelled form and proofread office form both cite the same delivered pack. | Spelling repair repeats one purchase.
Marquee hire for Stork reception area | Stork covered reception marquee rental | SK-18 provides one frame marquee. Its phone-photographed hire contract and contractor PDF have different file digests but the same structure number and term. | Document format variation does not change hire identity.
Swan canopy hire SW-S2, invoice including erection | Canopy rental for Swan, SW-S2, equipment charge | SW-S2 bills 30,000 cents rental and 8,000 cents erection. One form excludes erection from its amount though both claim the same erected canopy period. | Amount conflict involves one inclusive hire bill.
Temporary shelter tie-down kit for Goose, GS-40 | GS-40 anchor kit for Goose shelter frame | One form has neither amount nor receipt file. The contractor's installation sheet identifies one supplied tie-down kit GS-40, referenced in both descriptions. | Missing metadata still identifies one supplied kit.
Duck shelter canopy DK-S9, response allocation | DK-S9 canopy transferred to recovery allocation | DK-S9's rented structure moved between response and recovery locations without a new contract. Each lead submitted the original hire expense under a different incident. | A moved rental remains one purchase.
Temporary tent hire for Teal site | Temporary tent hire for Teal site | TL-3 covers a medical intake registration tent in May and TL-4 covers a separate June reception event. Distinct contracts and non-overlapping periods are documented. | Identical descriptions refer to independent hires.
Tent frame kit for Mallard north camp, MN-S1 | Tent frame kit for Mallard south camp, MS-S2 | The Mallard incident authorized two separately delivered frame kits for distinct camp sites. Different frame serials and installation signatures support both orders. | One incident includes two separate structure purchases.
Tarpaulin sheets for Grebe camp, GB-1 | Shelter assembly labor for Grebe camp, GB-2 | GB-1 buys weather sheets; GB-2 pays a separate crew to erect previously owned tents. Each fulfilled order costs 12,000 cents. | Equal price does not merge goods and labor.
Canopy roof fabric for Loon intake | Canopy roof seam repair for Loon intake | LN-5 buys spare roof fabric for storage. LN-6 separately pays repair labor on the current roof using materials already held by the contractor. | Related roof descriptions cover separate goods and service purchases.
Fire-retardant tarp for Avocet cooking shelter | Standard waterproof tarp for Avocet baggage shelter | AV-11 and AV-12 buy differently rated tarps for separate structures. Product markings, quantities, and separate delivery notes establish both orders. | Similar tarp products meet different independently bought requirements.
Original tent hire for Curlew week one | Extended tent hire for Curlew week two | CW-S7 hired the tent for the first week. CW-S8 is a separately authorized second-week extension, with each claim covering only its own non-overlapping period. | A new paid service period is distinct from the first hire.
Tent anchor purchase for Snipe SN-1 | Tent anchor purchase for Snipe SN-2 | SN-1 supplies sand anchors and SN-2 supplies ground stakes for different soil conditions. Separate receipts and deployment sheets document both purchases. | Different receipts corroborate independently needed anchor types.
Shelter cord for Plover yard PV-S2 | Shelter cord for Plover yard PV-S3 | Both entries lack amounts and receipt files. The signed store book records separate paid coils PV-S2 and PV-S3 issued to different construction teams. | Independent store acquisitions remain identifiable.
Wagtail shelter hire WG-1 on invoice WH-6 | Wagtail shelter hire WG-2 on invoice WH-6 | WH-6 combines two independently hired structures placed at separate sites. Each request names its own structure and fee rather than claiming the full consolidated bill. | Same invoice file holds two distinct hire purchases.
Sandpiper tent repair kit SP-S19, initial form | Sandpiper tent repair kit SP-S19, recovered draft | SP-S19 was bought once. A recovered offline draft uploaded twenty days after the initial form and retains the same supplier order and kit contents. | Restoring an old draft repeats the original kit.
Temporary cover for Dotterel yard | Shelter canopy for Dotterel yard | Two notes lack size, contractor, order reference, hire period, receipt, and installation record. Multiple covers were discussed but the site log does not show what was actually acquired. | The two notes cannot resolve procurement identity.
""")

family("bulk-meals", "heldout", """
Forty kilograms of rice for Aurora kitchen, AK-17 | Forty kilograms of rice for Aurora kitchen, AK-17 | AK-17 supplied two twenty-kilogram sacks once. The cook entered a form after the purchaser had already submitted the same paid kitchen delivery. | Both forms claim the same sacks.
Hot evening meals delivered for Boreal volunteers | Catered supper portions for Boreal's volunteer shift | BR-M4 provides eighty portions in one evening delivery. The dispatch manifest and kitchen intake link both descriptions to that same catering order. | Paraphrase refers to one delivered meal batch.
Chickpeas in catering tins for Zenith kitchen | Canned garbanzo beans for Zenith meal preparation | ZN-M6 supplies twelve large tins. Chickpea and garbanzo are the supplier and cook's names for the same product on that single order. | Equivalent ingredient terms concern the same tins.
Veg lunch 60 portions, Meridian, MD-8 | Sixty vegetarian lunch portions for Meridian crew, MD-8 | MD-8 is the caterer's single midday delivery. The abbreviated menu note and full coordinator form carry the same delivery signature. | Abbreviation expansion repeats one catering purchase.
Pasta supllies for Solstice kichen SL-M7 | Pasta supplies for Solstice kitchen, SL-M7 | SL-M7 delivered one twelve-kilogram carton. The typo-filled phone note and corrected kitchen form cite the same received carton. | Corrected spelling concerns one ingredient purchase.
Canned vegetables for Equinox cooking team | Equinox kitchen vegetable-tin order | EQ-10 is one case delivery. A wrinkled thermal receipt photo and its supplier duplicate PDF have different byte digests but the same sale number and case count. | Different receipt copies do not create another case purchase.
Twilight meal delivery TW-3 including service fee | Twilight catered meals TW-3, portion subtotal | TW-3 bills 20,000 cents portions and 2,000 cents service. One request records the complete bill, the other the portion subtotal, for the same supper delivery. | Amount discrepancy concerns one meal order's service charge.
Beans for Daybreak kitchen, delivery DB-5 | DB-5 canned beans for Daybreak meals | The cook's entry omits amount and receipt. The kitchen's signed receiving sheet identifies DB-5 as one delivery, and both forms reference its sale number. | Incomplete entry still identifies one goods delivery.
Rice purchased on Horizon HZ-M8 for intake meals | HZ-M8 rice reassigned to relocation meals | The kitchen stock transfer moved the same purchased rice sacks between incident budgets. Both meal coordinators later claimed the HZ-M8 supplier invoice. | Reallocating pantry stock does not create a second original purchase.
Lunch portions for Polaris volunteers | Lunch portions for Polaris volunteers | PO-11 supplies Monday lunch and PO-12 supplies Tuesday lunch. Both separately commissioned deliveries have signed portion counts and non-overlapping meal dates. | Identical wording describes independent catered meals.
Rice order for Northstar kitchen A, NA-2 | Rice order for Northstar kitchen B, NB-3 | The Northstar incident runs two kitchens. NA-2 and NB-3 are separately authorized sacks with distinct deliveries and stock-receiving signatures. | Same incident includes separate kitchen stock purchases.
Lentils for Comet kitchen, CM-M1 | Kitchen oven hire for Comet, CM-M2 | CM-M1 buys ingredients; CM-M2 rents an oven in a separate fulfilled contract. Each costs 15,000 cents. | Equal amounts do not equate ingredients and rented equipment.
Prepared meal trays for Meteor shift | Empty meal trays for Meteor packing team | ME-21 buys meals already portioned into trays. ME-22 separately buys empty packaging for the kitchen's later cooking run. Both orders have distinct receiving records. | Shared meal-tray wording hides meals versus packaging.
Gluten-free pasta for Orbit special-diet meals | Wheat pasta for Orbit general meals | OR-7 and OR-8 are separate products ordered for different diet groups. Ingredient labels, delivered quantities, and two supplier orders support both purchases. | Similar ingredients are independent dietary stocks.
First soup delivery for Eclipse overnight crew | Additional soup delivery for Eclipse overnight crew | EC-4's portions were consumed before new responders arrived. The coordinator authorized EC-5 as a separately cooked and delivered batch, documented by a second dispatch slip. | New demand and fulfillment establish a separate meal purchase.
Canned lentils for Celestial kitchen, CE-14 | Canned lentils for Celestial kitchen, CE-15 | CE-14 supplies six tins and CE-15 supplies eighteen after meal capacity increased. Different paid receipts and signatures establish independently acquired quantities. | Different receipts corroborate two ingredient purchases.
Bread collected for Galaxy meals, GX-4 | Bread collected for Galaxy meals, GX-5 | Amounts and receipt files are absent. The bakery ledger and kitchen signatures record GX-4 and GX-5 as separate paid collections for breakfast and supper. | Separate collections remain identifiable despite incomplete uploads.
Nebula meal order NE-1 on invoice NM-8 | Nebula meal order NE-2 on invoice NM-8 | NM-8 groups independently authorized lunches for two work sites. Each request claims only its own site order and delivered portion count. | Consolidated invoice does not make the separate orders overlap.
Rice sacks for Satellite kitchen ST-M9, first request | Satellite rice sacks ST-M9, delayed ledger capture | ST-M9 delivered two sacks once. The cook's paper ledger was captured sixteen days after purchasing's entry; no new goods arrived under ST-M9. | Delayed capture repeats one pantry purchase.
Food stock for Asteroid kitchen | Meal ingredients for Asteroid kitchen | Both entries omit item lists, quantities, supplier identity, order numbers, and receipts. The kitchen served multiple shifts and its receiving sheets are missing. | Facts do not establish one stock purchase or separate orders.
""")

family("flood-pumps", "heldout", """
One submersible pump hired for Brook cellar, BK-4 | One submersible pump hired for Brook cellar, BK-4 | BK-4 rents pump serial P-441 for one weekend. The cellar lead and site dispatcher both entered its same contractor invoice. | The same pump rental was submitted twice.
Rent a dewatering unit to drain Cascade basement | Sump-pump hire for removing standing floodwater at Cascade | CS-P8 identifies one hired unit installed at the basement sump. Both applicants refer to that unit's same issue sheet, serial, and hire dates. | Paraphrase describes one pump hire.
Discharge hose for Torrent drainage pump | Lay-flat outlet hose for Torrent dewatering unit | TR-P6 supplies one twenty-metre hose, listed as a discharge hose and described by the installer as a lay-flat outlet. Both reference its same delivery. | Equivalent equipment terms refer to one hose.
Sub pump 2in hire, Rill, RL-5 | Two-inch submersible pump rental for Rill site, RL-5 | RL-5 is the sole pump hire agreement for that unit and week. The coordinator expands the crew's abbreviated machine size and type. | Abbreviated and full wording identify one rental.
Drainage pumpe hire for Creek CR-P3 | Drainage pump hire for Creek, CR-P3 | CR-P3 rents one pump serial P-308. The phone entry misspells pump; the corrected form repeats its same serial and term. | Typo variation concerns one machine hire.
Pump hire for Stream culvert | Stream floodwater pump rental | ST-P19 rents one unit. The contractor's PDF contract and the crew's scanned signed issue sheet have different hashes but retain the same machine serial and dates. | Different receipt representations document one hire.
Rapids pump RP-7, rental with delivery | Flood pump rental for Rapids RP-7, hire subtotal | RP-7 bills 22,000 cents hire and 4,000 cents transport. One request excludes transport although both cover the same unit and rental period. | Amount conflict concerns charges on one contract.
Drainage hose kit for Falls, FL-P2 | FL-P2 pump outlet fittings for Falls | One entry lacks amount and receipt metadata. The signed installation record connects both descriptions to the one fittings-and-hose kit ordered as FL-P2. | Missing fields do not erase one known kit identity.
Deltafield pump hire DF-8 under flood incident | DF-8 pump moved to recovery incident at Deltafield | The contractor allowed the same hired unit to move between work areas without another contract. Both incident leads submitted the original DF-8 rental invoice. | Incident transfer does not create a new hire purchase.
Pump rental for Meander cellar | Pump rental for Meander cellar | MD-P11 hires a pump for an initial weekend. MD-P12 independently hires another unit after a later storm; distinct dates, serials, and return sheets support both. | Identical descriptions cover two fulfilled rentals.
Pump for left culvert at Tributary, TL-3 | Pump for right culvert at Tributary, TR-4 | The same incident requires simultaneous pumping at two culverts. TL-3 and TR-4 rent distinct serial-numbered units under separately authorized contracts. | One incident includes two independent machine hires.
Drainage pump hire for Watershed, WS-P1 | Drainage hose purchase for Watershed, WS-P2 | WS-P1 rents a pump and WS-P2 separately buys its compatible hose. Each independently fulfilled order costs 8,000 cents. | Same price does not equate rented machinery and bought accessories.
Floodwater pump for Confluence | Floodwater pump maintenance at Confluence | CF-20 hires a temporary unit. CF-21 separately pays a technician to service the site's owned unit, documented by parts and repair records. | Similar pump descriptions represent different goods and services.
Clean-water transfer pump for Rivermouth store | Dirty-water solids pump for Rivermouth cellar | RM-9 and RM-10 rent differently rated units for separate tasks. Separate serials and contractor issue sheets record each machine's installation. | Related pump types serve independently purchased tasks.
Pump hire at Headwater for days one to two | Pump hire extension at Headwater for days three to four | HW-2 pays the initial period and HW-3 pays a separately authorized extension. Neither claim includes days from the other's period, and the contractor separately bills both services. | Non-overlapping authorized hire periods are distinct purchases.
Pump couplings for Oxbow OB-5 | Pump couplings for Oxbow OB-6 | OB-5 supplies two-inch couplings and OB-6 supplies three-inch couplings for different outlet hoses. Distinct receipts and installed-part logs support both orders. | Different receipts establish independently needed part purchases.
Drainage-hose coil for Spillway SW-P4 | Drainage-hose coil for Spillway SW-P5 | Both forms lack amounts and receipt uploads. The hardware merchant's dispatch ledger records two separately paid coils, collected for different pump installations. | Supplier collection evidence establishes separate purchases.
Reservoir pump hire RV-P1 on invoice RH-7 | Reservoir pump hire RV-P2 on invoice RH-7 | RH-7 groups two independent rentals for different buildings. Each request identifies only its own serial-numbered unit and contract charge. | Shared invoice file contains non-overlapping rental purchases.
Flood outlet hose for Weir WR-P31, original form | Weir outlet hose WR-P31, restored offline form | WR-P31 supplied one hose coil. A restored phone backup uploaded its request eighteen days after the portal entry, without another coil shipment. | Restored form repeats the original hose procurement.
Pump equipment for Marsh work site | Drainage equipment for Marsh work site | Neither note identifies machinery, serial, hose size, supplier, hire dates, order reference, or receipt. Several work crews shared the site and no issue log remains. | Purchase identity cannot be established from the notes.
""")

family("passenger-transport", "heldout", """
Coach hire for forty travelers from Summit station, SM-14 | Coach hire for forty travelers from Summit station, SM-14 | SM-14 charters one coach departure with one signed passenger manifest. The travel lead and dispatcher each entered that departure's supplier bill. | One coach service has duplicate submissions.
Shuttle bus carrying evacuees from Valley pickup point | Passenger transfer coach from Valley assembly area | VL-T6 provided one timed departure for thirty passengers. Both descriptions link to its same booking reference, vehicle registration, and signed arrival sheet. | Paraphrase identifies the same passenger trip.
Wheelchair-accessible minibus for Mesa transfer | Lift-equipped passenger van for Mesa relocation trip | MS-T2 books one accessible vehicle whose supplier calls it a lift-equipped passenger van. Both forms cite its same passenger list and booking. | Equivalent transport names describe one booking.
Pax shuttle 16 seats, Ridge, RG-9 | Sixteen-seat passenger shuttle for Ridge relocation, RG-9 | RG-9 is the only sixteen-seat booking in the dispatch log. The coordinator expands the abbreviated passenger note from that trip's invoice. | Abbreviation expansion refers to one trip purchase.
Minbus tranfer for Plateau PT-T4 | Minibus transfer for Plateau, PT-T4 | PT-T4 is one completed trip. The misspelled phone submission and office correction both identify the same driver, vehicle, and signed arrival. | Typo correction repeats one transfer booking.
Bus transport from Canyon assembly point | Canyon passenger transfer service | CY-21 is one bus departure. A passenger lead's photographed receipt and the operator's PDF invoice differ in bytes but share CY-21 and the departure timestamp. | Different document files record the same trip.
Gorge shuttle GG-8, fare plus luggage trailer | Gorge shuttle GG-8, passenger fare only | GG-8 bills 26,000 cents passenger fare and 4,000 cents trailer. The two requests enter gross and fare-only amounts for the same vehicle departure. | Amount disagreement concerns one booking's charge components.
Accessible passenger trip for Ravine, RV-T3 | RV-T3 lift-van transfer for Ravine | One form omits amount and receipt. The operator's trip sheet identifies RV-T3 as one vehicle run and links both requesters to its same passenger manifest. | Missing fields still identify one completed trip.
Foothill coach FH-15 assigned to evacuation incident | FH-15 coach reassigned to return-home incident | Before departure the booking's destination changed and the trip moved to a new incident allocation. The operator still performed and billed only booking FH-15, entered by both teams. | Changed allocation and destination do not create another purchased trip.
Passenger coach hire for Highland group | Passenger coach hire for Highland group | HL-2 transports one group outbound on Monday and HL-3 returns them on Friday. Separate bookings, travel times, and signed manifests support both services. | Same description covers separate outward and return trips.
Bus for Lowland east pickup LL-E1 | Bus for Lowland west pickup LL-W2 | The Lowland incident authorizes two simultaneous vehicles at separate pickup points. Distinct registrations, driver logs, and passenger lists support independently booked services. | Same incident contains two separate bus purchases.
Minibus transfer for Midland group, ML-T1 | Printed transport route maps for Midland, ML-T2 | ML-T1 buys a completed passenger run and ML-T2 buys printed route leaflets. Each independently fulfilled order costs 6,400 cents. | Equal amount does not merge transport service and printed goods.
Passenger bus hire for Upland site | Passenger bus parking permit for Upland site | UP-5 buys a bus trip; UP-6 separately buys a municipality's event parking permit. The permit fee is not included in the operator's trip invoice. | Related bus wording covers two independent services.
Seated minibus for Escarpment walking passengers | Wheelchair-accessible minibus for Escarpment passengers | ES-T9 and ES-T10 book different vehicles for distinct passenger groups. Separate registrations and manifests document both completed transfers. | Similar journeys have independently purchased accessibility requirements.
First shuttle departure from Terraces, TC-3 | Additional shuttle departure from Terraces, TC-4 | TC-3's bus departed full. The coordinator separately ordered TC-4 for passengers left behind, supported by a second driver log and disjoint manifest. | A further completed run is a legitimate new service.
Coach booking for Basinview BV-T11 | Coach booking for Basinview BV-T12 | BV-T11 is a twenty-seat trip and BV-T12 is a forty-seat trip to another destination. Separate paid receipts, vehicle logs, and arrival signatures establish both. | Different receipts corroborate independent trips.
Minibus booking for Knoll KN-7 | Minibus booking for Knoll KN-8 | Amounts and receipt attachments are absent. The operator's retained booking book records KN-7 and KN-8 as separately paid trips on different dates with separate passenger lists. | Separate booking records establish distinct services.
Hillcrest transport HC-1 on statement HT-6 | Hillcrest transport HC-2 on statement HT-6 | HT-6 combines two independently booked transfers. Each claim covers only its named vehicle run and manifest rather than the operator's entire statement. | A shared statement contains distinct non-overlapping trips.
Summitview passenger run SV-41, dispatcher form | Summitview passenger run SV-41, delayed travel form | SV-41 was one completed journey. The travel lead's offline form synchronized thirteen days after the dispatcher entry, with no second trip under that booking. | Late submission repeats one transport purchase.
Passenger transfer for Crag group | Shuttle for Crag travelers | Both entries omit pickup point, destination, passenger count, supplier, booking number, receipt, and trip date. Several groups traveled that week and the operator log is unavailable. | The descriptions cannot resolve one booking versus separate trips.
""")

family("power-distribution", "heldout", """
Four outdoor extension leads for Alderfield command, AF-5 | Four outdoor extension leads for Alderfield command, AF-5 | AF-5 delivered one four-lead pack. The electrician's offline request and command lead's portal request both claim that same paid delivery. | One cable pack was submitted twice.
Portable outlet boxes to distribute power at Bracken desk | Temporary mains distribution boards for Bracken operations | BC-14 supplies one pair of portable boards. Both forms refer to the same equipment serials, order, and electrician's intake signature. | Paraphrase describes one board purchase.
Residual-current safety adaptors for Clover site | RCD plug-in protectors for Clover electrical outlets | CL-8 supplies one three-adaptor pack. The full safety-device term and RCD abbreviation come from the same product card and supplier order. | Equivalent safety-device terminology names one pack.
230V ext leads 20m x3, Fern, FN-7 | Three twenty-metre 230-volt extension cables for Fern station, FN-7 | FN-7 is the sole three-cable pickup. The second entry expands the electrician's abbreviated dimensions and voltage from that same invoice. | Abbreviated and full specifications refer to one purchase.
Electrc cable drum for Heather HT-P3 | Electric cable drum for Heather station, HT-P3 | HT-P3 delivered one serialized cable reel. The misspelled field entry and checked version both cite its same reel number and order. | Spelling correction repeats one reel purchase.
Distribution-board hire for Moss command room | Moss temporary electrical board rental | MS-P20 rents one numbered board. The contractor's PDF and the electrician's photograph of the signed hire sheet have different hashes but identify the same board and term. | Different receipt files support one rental.
Rush cable order RS-P6 with connector fitting | Cable for Rush RS-P6, cable charge only | RS-P6 bills 17,000 cents cable and 3,000 cents connector fitting. One request excludes fitting, although both concern the same cut length and supplied connectors. | Amount conflict concerns components of one supplied cable.
Outdoor socket box for Sedge, SG-11 | SG-11 weatherproof electrical outlet box for Sedge | One form lacks receipt and amount fields. The electrician's commissioning sheet ties both descriptions to the sole socket box purchased under SG-11. | Missing metadata leaves one known equipment purchase.
Thistle cable reel TH-8 for response base | TH-8 cable reel reassigned to recovery base | The same bought reel moved between incident allocations with a signed inventory transfer. Both base managers then submitted the original TH-8 supplier expense. | Reassigning owned equipment does not create another purchase.
Extension cables for Nettles command | Extension cables for Nettles command | NT-30 supplies cables for the first room and NT-31 supplies additional cables after expansion. Distinct paid deliveries and installed reel numbers support both. | Identical descriptions cover separately required purchases.
Socket boards for Reed east desk, RE-4 | Socket boards for Reed west desk, RW-P5 | One incident operates two separate control desks. RE-4 and RW-P5 are independently ordered boards with distinct serials and commissioning signatures. | Same incident contains two legitimate board purchases.
Cable reels for Willowfield store, WF-P1 | Cable floor protectors for Willowfield store, WF-P2 | WF-P1 buys reels and WF-P2 buys ramped cable covers. Each separately delivered order costs 10,000 cents. | Equal cost does not equate cables and floor covers.
Electrical outlet boxes for Sorrel command | Electrical outlet inspection for Sorrel command | SO-12 supplies new socket boxes. SO-13 pays an independent inspector to test the existing installation and issue a safety report. | Shared outlet terms describe separate equipment and inspection purchases.
Indoor extension lead pack for Sage office | Outdoor-rated extension lead pack for Sage yard | SA-P9 and SA-P10 buy differently rated packs installed in different locations. The product markings and separate supplier delivery notes support both. | Similar cables have distinct independently purchased ratings and uses.
First socket-board hire term for Thyme tent | Extended socket-board hire term for Thyme tent | TY-4 rents the board for the first weekend. TY-5 separately extends hire into the following week; each claim covers only its own contracted dates. | A new non-overlapping hire period is a distinct service purchase.
Electrical plug order for Basil BS-P2 | Electrical plug order for Basil BS-P3 | BS-P2 supplies 16-amp connectors and BS-P3 supplies 32-amp connectors for different equipment. Separate receipts and installation sheets document both orders. | Different receipts establish independent connector purchases.
Cable tie stock for Mint, MI-6 | Cable tie stock for Mint, MI-7 | Both submissions lack amounts and receipt files. The merchant's sales register and signed team collections distinguish MI-6 and MI-7 as separate pack sales for distinct installations. | Missing uploads do not merge separately recorded sales.
Rosemary board order RM-P1 on invoice RB-8 | Rosemary board order RM-P2 on invoice RB-8 | RB-8 combines separately commissioned boards for two sites. Each request claims its own serial-numbered board's invoice line and no portion of the other's line. | Shared invoice file contains independent equipment purchases.
Lavender extension reel LV-71, original entry | Lavender extension reel LV-71, recovered paper entry | LV-71 supplied one reel. Its paper form was captured seventeen days after the electronic entry and retains the original reel serial, with no new stock acquisition. | Later capture repeats the original reel purchase.
Electrical distribution kit for Parsley site | Power outlet kit for Parsley site | Both notes lack component lists, serials, ratings, supplier identity, order number, receipt, and delivery date. Several teams installed equipment, and no commissioning records survive. | Facts do not establish whether one kit or separate purchases were claimed.
""")

CATEGORIES = [
    "exact-description",
    "natural-paraphrase",
    "equivalent-terminology",
    "abbreviated-description",
    "typing-errors",
    "receipt-file-variation",
    "conflicting-amounts",
    "incomplete-structured-fields",
    "incident-allocation-change",
    "exact-description",
    "shared-incident",
    "equal-price",
    "overlapping-purpose-terms",
    "neighboring-product-specifications",
    "repeated-service-or-replenishment",
    "receipt-and-order-conflicts",
    "missing-attachments",
    "consolidated-document",
    "recording-time-gap",
    "insufficient-procurement-facts",
]


def digest(text):
    # These are fictional document fingerprints, not hashes of real receipts.
    return sha256(text.encode()).hexdigest()


def records(slug, family_index, index, descriptions):
    case_id = f"pair-{family_index + 1:02d}-{index + 1:02d}"
    # Amounts and timestamps are fixed, plausible fixture facts. They are not
    # sampled, optimized, or derived from predictions. Missing facts are null.
    amount = 3600 + family_index * 1700 + index * 200
    day = datetime(2026, 4, 3, 9, 0, tzinfo=timezone.utc) + timedelta(days=family_index * 7 + index)
    incident = f"fictional-{slug}-response"
    left = dict(id=f"{case_id}-a", incident=incident, description=descriptions[0],
                amountCents=amount, receiptDigest=None, transactionReference=None,
                createdAt=day.isoformat().replace("+00:00", "Z"))
    right = dict(id=f"{case_id}-b", incident=incident, description=descriptions[1],
                 amountCents=amount, receiptDigest=None, transactionReference=None,
                 createdAt=(day + timedelta(hours=2)).isoformat().replace("+00:00", "Z"))
    # Evidence configurations intentionally include contradictions and shared
    # non-identifying signals. None is a rule that assigns the authored intent.
    if index in (0, 8, 18):
        left["receiptDigest"] = right["receiptDigest"] = digest(f"{case_id}-document")
        left["transactionReference"] = right["transactionReference"] = f"fictional-sale-{case_id}"
    elif index == 3:
        left["transactionReference"] = right["transactionReference"] = f"fictional-sale-{case_id}"
    elif index in (5, 6, 9, 10, 11, 12, 13, 14, 15):
        left["receiptDigest"] = digest(f"{case_id}-document-a")
        right["receiptDigest"] = digest(f"{case_id}-document-b")
        if index >= 9:
            left["transactionReference"] = f"fictional-sale-{case_id}-a"
            right["transactionReference"] = f"fictional-sale-{case_id}-b"
    if index == 4:
        left["amountCents"] = right["amountCents"] = None
    if index == 6:
        # The source narratives' explicit component totals are material facts.
        totals = [(10800, 9600), (7500, 6500), (3300, 3000), (16000, 14000),
                  (27000, 24000), (13000, 11600), (18400, 16000), (38000, 30000),
                  (22000, 20000), (26000, 22000), (30000, 26000), (20000, 17000)]
        left["amountCents"], right["amountCents"] = totals[family_index]
    if index == 7:
        left["incident"] = None
        left["amountCents"] = None
        right["receiptDigest"] = digest(f"{case_id}-document-b")
    if index == 8:
        right["incident"] = f"fictional-{slug}-recovery"
    if index == 11:
        # Prices are explicitly equal in each source narrative.
        prices = [18000, 4800, 2600, 9000, 7200, 5600, 3200, 12000, 15000, 8000, 6400, 10000]
        left["amountCents"] = right["amountCents"] = prices[family_index]
    if index in (12, 15):
        right["amountCents"] = amount + 1100
    if index == 14:
        right["createdAt"] = (day + timedelta(days=4)).isoformat().replace("+00:00", "Z")
    if index == 16:
        left["amountCents"] = right["amountCents"] = None
        right["createdAt"] = (day + timedelta(days=6)).isoformat().replace("+00:00", "Z")
    if index == 17:
        left["receiptDigest"] = right["receiptDigest"] = digest(f"{case_id}-consolidated-document")
        left["transactionReference"] = f"fictional-sale-{case_id}-a"
        right["transactionReference"] = f"fictional-sale-{case_id}-b"
        right["amountCents"] = amount + 1300
    if index == 18:
        gaps = [11, 28, 14, 9, 12, 21, 15, 20, 16, 18, 13, 17]
        right["createdAt"] = (day + timedelta(days=gaps[family_index])).isoformat().replace("+00:00", "Z")
    if index == 19:
        for record in (left, right):
            record["incident"] = None
            record["amountCents"] = None
            record["receiptDigest"] = None
            record["transactionReference"] = None
    return case_id, left, right


def build():
    cases, construction = [], []
    for family_index, (slug, split, rows) in enumerate(FAMILIES):
        for index, (a, b, scenario, rationale) in enumerate(rows):
            case_id, left, right = records(slug, family_index, index, (a, b))
            cases.append(dict(id=case_id, groupId=f"{slug}-procurement-{index + 1:02d}",
                              supplyFamily=slug, category=CATEGORIES[index], split=split,
                              scenario=scenario, left=left, right=right))
            intent = "unresolved" if index == 19 else (
                "same_purchase" if index < 9 or index == 18 else "distinct_purchase")
            construction.append(dict(caseId=case_id, intent=intent, rationale=rationale))
    provenance = dict(kind="fictional-synthetic", language="English", author="AI coding agent",
                      modelBlind=True, humanLabeled=False, realFieldData=False,
                      constructionKeyIsIndependentAnnotation=False)
    dataset = dict(schemaVersion=1, datasetId=DATASET_ID, provenance=provenance,
                   splitPolicy=dict(unit="entire-supply-family", calibrationFamilies=4,
                                    heldoutFamilies=8, calibrationCases=80, heldoutCases=160,
                                    frozen=True, heldoutTuningAllowed=False), cases=cases)
    key = dict(schemaVersion=1, datasetId=DATASET_ID, provenance=provenance,
               warning="Construction intent only; not independent, human, expert, or field labels.",
               constructionIntent=construction)
    check(dataset, key)
    return dataset, key


def check(dataset, key):
    cases = dataset["cases"]
    assert len(cases) == 240
    assert Counter(c["split"] for c in cases) == {"calibration": 80, "heldout": 160}
    assert Counter(c["supplyFamily"] for c in cases) == {f[0]: 20 for f in FAMILIES}
    assert len({c["id"] for c in cases}) == len(cases)
    assert len({c["groupId"] for c in cases}) == len(cases)
    field_names = {"id", "incident", "description", "amountCents", "receiptDigest",
                   "transactionReference", "createdAt"}
    annotation_names = {"expected", "label", "duplicate", "intent", "rationale", "expectedDuplicate"}
    all_records = [c[side] for c in cases for side in ("left", "right")]
    assert len({r["id"] for r in all_records}) == 480
    for case in cases:
        assert not annotation_names.intersection(case)
        assert case["scenario"].strip()
        for side in ("left", "right"):
            record = case[side]
            assert set(record) == field_names
            assert 0 < len(record["description"].strip()) <= 2000
            assert record["amountCents"] is None or (
                type(record["amountCents"]) is int and record["amountCents"] >= 0)
            assert record["incident"] is None or isinstance(record["incident"], str)
            assert record["transactionReference"] is None or isinstance(record["transactionReference"], str)
            assert record["receiptDigest"] is None or (
                len(record["receiptDigest"]) == 64 and int(record["receiptDigest"], 16) >= 0)
            datetime.fromisoformat(record["createdAt"].replace("Z", "+00:00"))
    for field in ("groupId", "supplyFamily"):
        cal = {c[field] for c in cases if c["split"] == "calibration"}
        held = {c[field] for c in cases if c["split"] == "heldout"}
        assert not cal.intersection(held), field
    intents = {row["caseId"]: row["intent"] for row in key["constructionIntent"]}
    assert set(intents) == {c["id"] for c in cases}
    assert Counter(intents.values()) == {"same_purchase": 120, "distinct_purchase": 108, "unresolved": 12}
    assert Counter(intents[c["id"]] for c in cases if c["split"] == "heldout") == {
        "same_purchase": 80, "distinct_purchase": 72, "unresolved": 8}
    # Compare descriptions against the untouched legacy fixtures without import
    # or model execution. No old literal is present in the new heldout set.
    legacy_source = (ROOT / "src/risk/benchmark-fixtures.ts").read_text()
    import re
    legacy_descriptions = re.findall(r"(?:left|right):\s*'([^']*)'", legacy_source)
    assert len(legacy_descriptions) == 24
    held_descriptions = {r["description"] for c in cases if c["split"] == "heldout"
                         for r in (c["left"], c["right"])}
    assert not held_descriptions.intersection(legacy_descriptions)
    pairs = [(c["left"]["description"], c["right"]["description"]) for c in cases]
    assert len(set(pairs)) == 240, "Repeated full pairs"


def main():
    dataset, key = build()
    directory = ROOT / "evaluation"
    directory.mkdir(exist_ok=True)
    paths = [(directory / "cases-unlabeled.json", dataset),
             (directory / "author-scenario-key.json", key)]
    for path, content in paths:
        path.write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(dict(totalCases=240, calibrationCases=80, heldoutCases=160,
                         categories=dict(Counter(c["category"] for c in dataset["cases"])),
                         independentAnnotationsProduced=False,
                         heldoutAuthoredBinary=152, heldoutAuthoredUnresolved=8,
                         files={str(p.relative_to(ROOT)): sha256(p.read_bytes()).hexdigest()
                                for p, _ in paths}), indent=2))


if __name__ == "__main__":
    main()
