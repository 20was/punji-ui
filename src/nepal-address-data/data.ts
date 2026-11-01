/**
 * Nepal's administrative divisions since 2017: 7 provinces, 77 districts and 753 local levels (6 metropolitan cities,
 * 11 sub-metropolitan cities, 276 municipalities and 460 rural municipalities). Province and district names are in
 * English and Nepali; local-level names are in English as commonly romanised.
 *
 * A separate subpath (`@punji/ui/nepal-address-data`) so the root import stays small: NepalAddressPicker loads it on
 * demand with a dynamic import. The ids are this library's (district 1 is Taplejung), not government codes; store the
 * names or map them to your own codes. Names are renamed from time to time by local resolution: check the list against
 * the Ministry of Federal Affairs and General Administration before relying on it for a regulated record, and send a
 * fix if one is out of date. Pure data: no React, no browser globals.
 */

export type LocalLevelType = 'metropolitan' | 'sub-metropolitan' | 'municipality' | 'rural-municipality';

export interface NepalProvince {
  /** 1 to 7 (Koshi is 1, Sudurpashchim 7). */
  id: number;
  /** English name ('Koshi'). */
  name: string;
  /** Nepali name ('कोशी'). */
  nameNe: string;
}

export interface NepalDistrict {
  /** 1 to 77 in this list's order. */
  id: number;
  /** The province the district belongs to. */
  provinceId: number;
  /** English name ('Kathmandu'). */
  name: string;
  /** Nepali name ('काठमाडौं'). */
  nameNe: string;
}

export interface NepalLocalLevel {
  /** `${districtId}-${n}`, stable within a release of this list. */
  id: string;
  /** The district the local level belongs to. */
  districtId: number;
  /** English name without the type ('Budhanilkantha'). */
  name: string;
  /** Metropolitan city, sub-metropolitan city, municipality or rural municipality. */
  type: LocalLevelType;
}

export interface NepalAddressData {
  /** The seven provinces in order. */
  provinces: readonly NepalProvince[];
  /** The 77 districts, grouped by province. */
  districts: readonly NepalDistrict[];
  /** The 753 local levels, grouped by district. */
  localLevels: readonly NepalLocalLevel[];
}

const PROVINCES: readonly (readonly [string, string])[] = [
  ['Koshi', 'कोशी'], ['Madhesh', 'मधेश'], ['Bagmati', 'बागमती'], ['Gandaki', 'गण्डकी'], ['Lumbini', 'लुम्बिनी'], ['Karnali', 'कर्णाली'], ['Sudurpashchim', 'सुदूरपश्चिम'],
];

// One line per district: "province|English|Nepali|local levels". A local level ends in ! (metropolitan city),
// ^ (sub-metropolitan city) or * (municipality); no mark is a rural municipality.
const DISTRICTS = `1|Taplejung|ताप्लेजुङ|Phungling*,Aathrai Tribeni,Maiwakhola,Meringden,Mikwakhola,Phaktanglung,Sidingba,Sirijangha,Yangwarak
1|Panchthar|पाँचथर|Phidim*,Phalelung,Phalgunanda,Hilihang,Kummayak,Miklajung,Tumbewa,Yangwarak
1|Ilam|इलाम|Ilam*,Deumai*,Mai*,Suryodaya*,Chulachuli,Phakphokthum,Mai Jogmai,Mangsebung,Rong,Sandakpur
1|Jhapa|झापा|Mechinagar*,Birtamod*,Damak*,Bhadrapur*,Arjundhara*,Kankai*,Shivasatakshi*,Gauradaha*,Barhadashi,Buddhashanti,Gauriganj,Haldibari,Jhapa,Kachankawal,Kamal
1|Morang|मोरङ|Biratnagar!,Sundar Haraincha*,Belbari*,Pathari Shanishchare*,Ratuwamai*,Urlabari*,Rangeli*,Sunawarshi*,Letang*,Budhiganga,Dhanpalthan,Gramthan,Jahada,Kanepokhari,Katahari,Kerabari,Miklajung
1|Sunsari|सुनसरी|Itahari^,Dharan^,Inaruwa*,Duhabi*,Ramdhuni*,Barahakshetra*,Barju,Bhokraha Narsingh,Dewanganj,Gadhi,Harinagar,Koshi
1|Dhankuta|धनकुटा|Dhankuta*,Pakhribas*,Mahalaxmi*,Chaubise,Chhathar Jorpati,Khalsa Chhintang Sahidbhumi,Sangurigadhi
1|Terhathum|तेह्रथुम|Myanglung*,Laligurans*,Aathrai,Chhathar,Menchayam,Phedap
1|Sankhuwasabha|संखुवासभा|Chainpur*,Dharmadevi*,Khandbari*,Madi*,Panchkhapan*,Bhotkhola,Chichila,Makalu,Sabhapokhari,Silichong
1|Bhojpur|भोजपुर|Bhojpur*,Shadananda*,Aamchowk,Arun,Hatuwagadhi,Pauwadungma,Ramprasad Rai,Salpasilichho,Tyamkemaiyung
1|Solukhumbu|सोलुखुम्बु|Solududhkunda*,Dudhkoshi,Khumbu Pasanglhamu,Likhupike,Mapya Dudhkoshi,Mahakulung,Necha Salyan,Sotang
1|Okhaldhunga|ओखलढुङ्गा|Siddhicharan*,Champadevi,Chishankhugadhi,Khijidemba,Likhu,Manebhanjyang,Molung,Sunkoshi
1|Khotang|खोटाङ|Halesi Tuwachung*,Diktel Rupakot Majhuwagadhi*,Aiselukharka,Barahapokhari,Diprung Chuichumma,Jantedhunga,Kepilasgadhi,Khotehang,Rawabesi,Sakela
1|Udayapur|उदयपुर|Triyuga*,Katari*,Chaudandigadhi*,Belaka*,Rautamai,Sunkoshi,Tapli,Udayapurgadhi
2|Saptari|सप्तरी|Rajbiraj*,Kanchanrup*,Dakneshwori*,Bodebarsain*,Khadak*,Shambhunath*,Surunga*,Hanumannagar Kankalini*,Saptakoshi*,Agnisaira Krishnasavaran,Balan-Bihul,Bishnupur,Chhinnamasta,Mahadeva,Rajgadh,Rupani,Tilathi Koiladi,Tirahut
2|Siraha|सिराहा|Lahan*,Dhangadhimai*,Siraha*,Golbazar*,Mirchaiya*,Kalyanpur*,Karjanha*,Sukhipur*,Arnama,Aurahi,Bariyarpatti,Bhagwanpur,Bishnupur,Laxmipur Patari,Naraha,Navarajpur,Sakhuwanankarkatti
2|Dhanusha|धनुषा|Janakpurdham^,Chhireshwarnath*,Ganeshman Charnath*,Dhanushadham*,Nagarain*,Bideha*,Mithila*,Sahidnagar*,Sabaila*,Kamala*,Mithila Bihari*,Hansapur*,Aurahi,Bateshwar,Dhanauji,Janaknandini,Lakshminiya,Mukhiyapatti Musaharmiya
2|Mahottari|महोत्तरी|Jaleshwar*,Bardibas*,Gaushala*,Loharpatti*,Ramgopalpur*,Manara Shiswa*,Matihani*,Bhangaha*,Balwa*,Aurahi*,Ekdanra,Mahottari,Pipara,Samsi,Sonama
2|Sarlahi|सर्लाही|Ishworpur*,Malangwa*,Lalbandi*,Haripur*,Haripurwa*,Hariwan*,Barahathawa*,Balara*,Godaita*,Bagmati*,Kabilasi*,Bishnu,Brahampuri,Chakraghatta,Chandranagar,Dhankaul,Kaudena,Parsa,Ramnagar,Basbariya
2|Rautahat|रौतहट|Chandrapur*,Garuda*,Gaur*,Baudhimai*,Brindaban*,Dewahi Gonahi*,Gadhimai*,Gujara*,Katahariya*,Madhav Narayan*,Maulapur*,Phatuwa Bijayapur*,Ishanath*,Paroha*,Rajpur*,Rajdevi*,Durga Bhagwati,Yamunamai
2|Bara|बारा|Kalaiya^,Jitpursimara^,Kolhabi*,Nijgadh*,Mahagadhimai*,Simraungadh*,Pacharauta*,Adarsha Kotwal,Baragadhi,Bishrampur,Devtal,Karaiyamai,Parwanipur,Pheta,Prasauni,Suwarna
2|Parsa|पर्सा|Birgunj!,Bahudarmai*,Parsagadhi*,Pokhariya*,Bindabasini,Chhipaharmai,Dhobini,Jagarnathpur,Jirabhawani,Kalikamai,Pakahamainpur,Paterwasugauli,Sakhuwaprasauni,Thori
3|Dolakha|दोलखा|Bhimeshwar*,Jiri*,Baiteshwar,Bigu,Gaurishankar,Kalinchok,Melung,Shailung,Tamakoshi
3|Sindhupalchok|सिन्धुपाल्चोक|Chautara Sangachokgadhi*,Barhabise*,Melamchi*,Balefi,Bhotekoshi,Helambu,Indrawati,Jugal,Lisankhu Pakhar,Panchpokhari Thangpal,Sunkoshi,Tripurasundari
3|Rasuwa|रसुवा|Gosaikunda,Kalika,Naukunda,Aamachhodingmo,Uttargaya
3|Dhading|धादिङ|Nilakantha*,Dhunibesi*,Benighat Rorang,Gajuri,Galchhi,Gangajamuna,Jwalamukhi,Khaniyabas,Netrawati Dabjong,Rubi Valley,Siddhalek,Thakre,Tripurasundari
3|Nuwakot|नुवाकोट|Bidur*,Belkotgadhi*,Dupcheshwar,Kakani,Kispang,Myagang,Panchakanya,Likhu,Shivapuri,Suryagadhi,Tadi,Tarakeshwar
3|Kathmandu|काठमाडौं|Kathmandu!,Budhanilkantha*,Chandragiri*,Dakshinkali*,Gokarneshwar*,Kageshwori Manohara*,Kirtipur*,Nagarjun*,Shankharapur*,Tarakeshwar*,Tokha*
3|Bhaktapur|भक्तपुर|Bhaktapur*,Changunarayan*,Madhyapur Thimi*,Suryabinayak*
3|Lalitpur|ललितपुर|Lalitpur!,Godawari*,Mahalaxmi*,Bagmati,Konjyosom,Mahankal
3|Kavrepalanchok|काभ्रेपलाञ्चोक|Dhulikhel*,Banepa*,Panauti*,Panchkhal*,Namobuddha*,Mandandeupur*,Bethanchok,Bhumlu,Chaurideurali,Khanikhola,Mahabharat,Roshi,Temal
3|Ramechhap|रामेछाप|Manthali*,Ramechhap*,Doramba,Gokulganga,Khandadevi,Likhu Tamakoshi,Sunapati,Umakunda
3|Sindhuli|सिन्धुली|Kamalamai*,Dudhauli*,Golanjor,Ghyanglekh,Hariharpurgadhi,Marin,Phikkal,Sunkoshi,Tinpatan
3|Makwanpur|मकवानपुर|Hetauda^,Thaha*,Bagmati,Bakaiya,Bhimphedi,Indrasarowar,Kailash,Makawanpurgadhi,Manahari,Raksirang
3|Chitwan|चितवन|Bharatpur!,Kalika*,Khairahani*,Madi*,Ratnanagar*,Rapti*,Ichchhakamana
4|Gorkha|गोरखा|Gorkha*,Palungtar*,Aarughat,Ajirkot,Bhimsen Thapa,Chum Nubri,Dharche,Gandaki,Sahid Lakhan,Siranchok,Barpak Sulikot
4|Lamjung|लमजुङ|Besishahar*,Madhyanepal*,Rainas*,Sundarbazar*,Dordi,Dudhpokhari,Kwholasothar,Marsyangdi
4|Tanahun|तनहुँ|Bhanu*,Bhimad*,Byas*,Shuklagandaki*,Anbukhaireni,Bandipur,Devghat,Ghiring,Myagde,Rhishing
4|Syangja|स्याङ्जा|Galyang*,Chapakot*,Putalibazar*,Bheerkot*,Waling*,Arjunchaupari,Aandhikhola,Kaligandaki,Phedikhola,Harinas,Biruwa
4|Kaski|कास्की|Pokhara!,Annapurna,Machhapuchchhre,Madi,Rupa
4|Manang|मनाङ|Chame,Narphu,Nashong,Manang Ngisyang
4|Mustang|मुस्ताङ|Gharapjhong,Lomanthang,Lo-Ghekar Damodarkunda,Thasang,Barhagaun Muktikshetra
4|Myagdi|म्याग्दी|Beni*,Annapurna,Dhaulagiri,Malika,Mangala,Raghuganga
4|Parbat|पर्वत|Kushma*,Phalebas*,Bihadi,Jaljala,Mahashila,Modi,Painyu
4|Baglung|बागलुङ|Baglung*,Dhorpatan*,Galkot*,Jaimini*,Badigad,Bareng,Kanthekhola,Nisikhola,Taman Khola,Tara Khola
4|Nawalparasi East|नवलपरासी (बर्दघाट सुस्ता पूर्व)|Kawasoti*,Gaindakot*,Devchuli*,Madhyabindu*,Bulingtar,Binayi Tribeni,Hupsekot,Baudikali
5|Rukum East|रुकुम (पूर्वी भाग)|Bhume,Putha Uttarganga,Sisne
5|Rolpa|रोल्पा|Rolpa*,Gangadev,Lungri,Madi,Pariwartan,Runtigadhi,Sunchhahari,Sunil Smriti,Thabang,Tribeni
5|Pyuthan|प्युठान|Pyuthan*,Sworgadwari*,Ayirabati,Gaumukhi,Jhimruk,Mallarani,Mandavi,Naubahini,Sarumarani
5|Gulmi|गुल्मी|Musikot*,Resunga*,Chandrakot,Chatrakot,Dhurkot,Gulmidarbar,Isma,Kaligandaki,Madane,Malika,Ruru,Satyawati
5|Arghakhanchi|अर्घाखाँची|Sandhikharka*,Sitganga*,Bhumikasthan*,Chhatradev,Malarani,Panini
5|Palpa|पाल्पा|Tansen*,Rampur*,Bagnaskali,Mathagadhi,Nisdi,Purbakhola,Rainadevi Chhahara,Rambha,Ribdikot,Tinau
5|Nawalparasi West|नवलपरासी (बर्दघाट सुस्ता पश्चिम)|Bardaghat*,Ramgram*,Sunwal*,Susta,Palhinandan,Pratappur,Sarawal
5|Rupandehi|रुपन्देही|Butwal^,Devdaha*,Lumbini Sanskritik*,Sainamaina*,Siddharthanagar*,Tilottama*,Gaidahawa,Kanchan,Kotahimai,Marchawari,Mayadevi,Omsatiya,Rohini,Sammarimai,Siyari,Suddhodhan
5|Kapilvastu|कपिलवस्तु|Kapilvastu*,Banganga*,Buddhabhumi*,Shivaraj*,Krishnanagar*,Maharajganj*,Mayadevi,Suddhodhan,Yashodhara,Bijaynagar
5|Dang|दाङ|Ghorahi^,Tulsipur^,Lamahi*,Babai,Banglachuli,Dangisharan,Gadhawa,Rajpur,Rapti,Shantinagar
5|Banke|बाँके|Nepalgunj^,Kohalpur*,Baijanath,Duduwa,Janaki,Khajura,Narainapur,Rapti Sonari
5|Bardiya|बर्दिया|Gulariya*,Madhuwan*,Rajapur*,Thakurbaba*,Bansgadhi*,Barbardiya*,Badhaiyatal,Geruwa
6|Dolpa|डोल्पा|Thuli Bheri*,Tripurasundari*,Dolpo Buddha,She Phoksundo,Jagadulla,Mudkechula,Kaike,Chharka Tangsong
6|Mugu|मुगु|Chhayanath Rara*,Mugum Karmarong,Soru,Khatyad
6|Humla|हुम्ला|Simkot,Namkha,Kharpunath,Sarkegad,Chankheli,Adanchuli,Tanjakot
6|Jumla|जुम्ला|Chandannath*,Kankasundari,Sinja,Hima,Tila,Guthichaur,Tatopani,Patarasi
6|Kalikot|कालिकोट|Khandachakra*,Raskot*,Tilagufa*,Pachaljharana,Sanni Tribeni,Narharinath,Kalika,Mahawai,Palata
6|Dailekh|दैलेख|Narayan*,Dullu*,Chamunda Bindrasaini*,Aathabis*,Bhagawatimai,Gurans,Dungeshwar,Naumule,Mahabu,Bhairabi,Thantikandh
6|Jajarkot|जाजरकोट|Bheri*,Chhedagad*,Nalgad*,Barekot,Kuse,Junichande,Shivalaya
6|Rukum West|रुकुम (पश्चिम भाग)|Musikot*,Chaurjahari*,Aathbiskot*,Banphikot,Tribeni,Sanibheri
6|Salyan|सल्यान|Sharada*,Bagchaur*,Bangad Kupinde*,Kalimati,Tribeni,Kapurkot,Chhatreshwari,Siddha Kumakh,Kumakh,Darma
6|Surkhet|सुर्खेत|Birendranagar*,Bheriganga*,Gurbhakot*,Panchapuri*,Lekbesi*,Chaukune,Barahatal,Chingad,Simta
7|Bajura|बाजुरा|Badimalika*,Triveni*,Budhiganga*,Budhinanda*,Gaumul,Jagannath,Swamikartik Khapar,Khaptad Chhededaha,Himali
7|Bajhang|बझाङ|Jayaprithvi*,Bungal*,Talkot,Masta,Khaptadchhanna,Thalara,Bitthadchir,Surma,Chhabispathibhera,Durgathali,Kedarsyu,Saipal
7|Achham|अछाम|Mangalsen*,Kamalbazar*,Sanphebagar*,Panchadewal Binayak*,Chaurpati,Mellekh,Bannigadhi Jayagadh,Ramaroshan,Dhakari,Turmakhand
7|Doti|डोटी|Dipayal Silgadhi*,Shikhar*,Purbichauki,Badikedar,Jorayal,Sayal,Aadarsha,K.I. Singh,Bogatan Phudsil
7|Kailali|कैलाली|Dhangadhi^,Tikapur*,Ghodaghodi*,Lamki Chuha*,Bhajani*,Godawari*,Gauriganga*,Janaki,Bardagoriya,Mohanyal,Kailari,Joshipur,Chure
7|Kanchanpur|कञ्चनपुर|Bhimdatta*,Punarbas*,Bedkot*,Mahakali*,Shuklaphanta*,Belauri*,Krishnapur*,Beldandi,Laljhadi
7|Dadeldhura|डडेल्धुरा|Amargadhi*,Parshuram*,Aalitaal,Bhageshwar,Navadurga,Ajaymeru,Ganyapdhura
7|Baitadi|बैतडी|Dasharathchand*,Patan*,Melauli*,Purchaudi*,Surnaya,Sigas,Shivanath,Pancheshwar,Dogdakedar,Dilasaini
7|Darchula|दार्चुला|Mahakali*,Shailyashikhar*,Malikarjun,Apihimal,Duhun,Naugad,Marma,Lekam,Byas`;

const MARKS: Record<string, LocalLevelType> = { '!': 'metropolitan', '^': 'sub-metropolitan', '*': 'municipality' };

function build(): NepalAddressData {
  const provinces = PROVINCES.map(([name, nameNe], index) => Object.freeze({ id: index + 1, name, nameNe }));
  const districts: NepalDistrict[] = [];
  const localLevels: NepalLocalLevel[] = [];
  DISTRICTS.split('\n').forEach((line, index) => {
    const [province, name, nameNe, levels] = line.split('|') as [string, string, string, string];
    const id = index + 1;
    districts.push(Object.freeze({ id, provinceId: Number(province), name, nameNe }));
    levels.split(',').forEach((raw, n) => {
      const mark = raw.slice(-1);
      const type = MARKS[mark];
      localLevels.push(Object.freeze({ id: `${id}-${n + 1}`, districtId: id, name: type ? raw.slice(0, -1) : raw, type: type ?? 'rural-municipality' }));
    });
  });
  return Object.freeze({ provinces: Object.freeze(provinces), districts: Object.freeze(districts), localLevels: Object.freeze(localLevels) });
}

/** The full list, built once from a compact table. */
export const nepalAddressData: NepalAddressData = build();
