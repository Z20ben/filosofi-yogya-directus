import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Mock data for agenda_events with complete Indonesian and English translations
const AGENDA_EVENTS = [
  {
    slug: 'jogja-fashion-week-2026',
    event_date: '2026-03-15',
    start_time: '10:00',
    end_time: '21:00',
    latitude: -7.7956,
    longitude: 110.3641,
    tags: ['fashion', 'budaya', 'desainer'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Jogja Fashion Week 2026',
        description: 'Event fashion tahunan yang menampilkan karya desainer lokal dan nasional dengan sentuhan budaya Yogyakarta.',
        location: 'Taman Budaya Yogyakarta',
        organizer: 'Dinas Pariwisata DIY',
        ticket_price: 'Rp 50.000 - Rp 200.000'
      },
      'en-US': {
        title: 'Jogja Fashion Week 2026',
        description: 'Annual fashion event showcasing local and national designers with Yogyakarta cultural touch.',
        location: 'Yogyakarta Cultural Park',
        organizer: 'DIY Tourism Office',
        ticket_price: 'IDR 50,000 - IDR 200,000'
      }
    }
  },
  {
    slug: 'workshop-batik-modern',
    event_date: '2026-02-20',
    start_time: '09:00',
    end_time: '16:00',
    latitude: -7.8278,
    longitude: 110.3981,
    tags: ['batik', 'workshop', 'kerajinan'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Workshop Batik Modern',
        description: 'Pelatihan membatik dengan teknik tradisional dan modern untuk pemula hingga mahir.',
        location: 'Kotagede Heritage Center',
        organizer: 'Komunitas Batik Yogyakarta',
        ticket_price: 'Rp 150.000 (termasuk material)'
      },
      'en-US': {
        title: 'Modern Batik Workshop',
        description: 'Batik training with traditional and modern techniques for beginners to advanced.',
        location: 'Kotagede Heritage Center',
        organizer: 'Yogyakarta Batik Community',
        ticket_price: 'IDR 150,000 (includes materials)'
      }
    }
  },
  {
    slug: 'sekaten-grebeg-maulud',
    event_date: '2026-09-15',
    start_time: '07:00',
    end_time: '22:00',
    latitude: -7.8054,
    longitude: 110.3644,
    tags: ['tradisi', 'religi', 'keraton'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Sekaten & Grebeg Maulud',
        description: 'Perayaan tradisional memperingati Maulid Nabi Muhammad SAW dengan arak-arakan gunungan dari Keraton.',
        location: 'Keraton Yogyakarta & Alun-alun Utara',
        organizer: 'Keraton Ngayogyakarta Hadiningrat',
        ticket_price: 'Gratis'
      },
      'en-US': {
        title: 'Sekaten & Grebeg Maulud',
        description: 'Traditional celebration commemorating Prophet Muhammad\'s birthday with gunungan parade from the Palace.',
        location: 'Yogyakarta Palace & North Square',
        organizer: 'Ngayogyakarta Hadiningrat Palace',
        ticket_price: 'Free'
      }
    }
  },
  {
    slug: 'festival-kesenian-yogyakarta',
    event_date: '2026-06-21',
    start_time: '18:00',
    end_time: '23:00',
    latitude: -7.7972,
    longitude: 110.3681,
    tags: ['seni', 'budaya', 'pertunjukan'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Festival Kesenian Yogyakarta',
        description: 'Festival seni tahunan menampilkan pertunjukan wayang, tari tradisional, dan musik gamelan.',
        location: 'Benteng Vredeburg',
        organizer: 'Dinas Kebudayaan DIY',
        ticket_price: 'Rp 25.000 - Rp 100.000'
      },
      'en-US': {
        title: 'Yogyakarta Arts Festival',
        description: 'Annual arts festival featuring wayang performances, traditional dance, and gamelan music.',
        location: 'Fort Vredeburg',
        organizer: 'DIY Cultural Office',
        ticket_price: 'IDR 25,000 - IDR 100,000'
      }
    }
  },
  {
    slug: 'pasar-seni-rakyat',
    event_date: '2026-04-10',
    start_time: '16:00',
    end_time: '22:00',
    latitude: -7.8116,
    longitude: 110.3632,
    tags: ['pasar', 'seni', 'kuliner'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Pasar Seni Rakyat',
        description: 'Pasar malam dengan bazaar kerajinan, kuliner tradisional, dan pertunjukan seni jalanan.',
        location: 'Alun-alun Kidul',
        organizer: 'Komunitas Seni Jogja',
        ticket_price: 'Gratis (bayar per tenant)'
      },
      'en-US': {
        title: 'Folk Art Market',
        description: 'Night market with craft bazaar, traditional culinary, and street art performances.',
        location: 'South Square',
        organizer: 'Jogja Art Community',
        ticket_price: 'Free (pay per vendor)'
      }
    }
  }
];

// Mock data for umkm_lokal
const UMKM_LOKAL = [
  {
    slug: 'batik-winotosastro',
    latitude: -7.8058,
    longitude: 110.3611,
    phone: '+62 274 123456',
    whatsapp: '+62 812 3456 7890',
    instagram: '@batikwinotosastro',
    facebook: 'batikwinotosastro',
    website: 'https://batikwino.com',
    tags: ['batik', 'fashion', 'tradisional'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Batik Winotosastro',
        description: 'Pengrajin batik tulis tradisional dengan kualitas tinggi, warisan turun temurun sejak 1950.',
        address: 'Jl. Taman Siswa, Wirogunan, Mergangsan',
        category: 'Fashion & Kerajinan',
        opening_hours: '09:00 - 17:00',
        price_range: 'Rp 150.000 - Rp 2.500.000'
      },
      'en-US': {
        name: 'Batik Winotosastro',
        description: 'Traditional hand-drawn batik craftsman with high quality, passed down since 1950.',
        address: 'Jl. Taman Siswa, Wirogunan, Mergangsan',
        category: 'Fashion & Crafts',
        opening_hours: '09:00 AM - 5:00 PM',
        price_range: 'IDR 150,000 - IDR 2,500,000'
      }
    }
  },
  {
    slug: 'kerajinan-perak-kotagede',
    latitude: -7.8278,
    longitude: 110.3981,
    phone: '+62 274 234567',
    whatsapp: '+62 813 4567 8901',
    instagram: '@perakkotagede',
    tags: ['perak', 'perhiasan', 'kerajinan'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Kerajinan Perak Kotagede',
        description: 'Sentra kerajinan perak dengan desain tradisional dan modern berkualitas tinggi.',
        address: 'Jl. Mondorakan, Prenggan, Kotagede',
        category: 'Perhiasan',
        opening_hours: '08:00 - 17:00',
        price_range: 'Rp 50.000 - Rp 5.000.000'
      },
      'en-US': {
        name: 'Kotagede Silver Craft',
        description: 'Silver craft center with high-quality traditional and modern designs.',
        address: 'Jl. Mondorakan, Prenggan, Kotagede',
        category: 'Jewelry',
        opening_hours: '08:00 AM - 5:00 PM',
        price_range: 'IDR 50,000 - IDR 5,000,000'
      }
    }
  },
  {
    slug: 'gudeg-yu-djum',
    latitude: -7.7854,
    longitude: 110.3666,
    phone: '+62 274 515235',
    whatsapp: '+62 812 2700 1234',
    instagram: '@gudegyudjum',
    website: 'https://gudegyudjum.com',
    tags: ['kuliner', 'gudeg', 'tradisional'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Gudeg Yu Djum',
        description: 'Rumah makan gudeg legendaris dengan cita rasa autentik khas Yogyakarta sejak 1951.',
        address: 'Jl. Margo Utomo No.77, Gowongan, Jetis',
        category: 'Kuliner Tradisional',
        opening_hours: '24 jam',
        price_range: 'Rp 15.000 - Rp 50.000'
      },
      'en-US': {
        name: 'Gudeg Yu Djum',
        description: 'Legendary gudeg restaurant with authentic Yogyakarta taste since 1951.',
        address: 'Jl. Margo Utomo No.77, Gowongan, Jetis',
        category: 'Traditional Culinary',
        opening_hours: '24 hours',
        price_range: 'IDR 15,000 - IDR 50,000'
      }
    }
  },
  {
    slug: 'bakpia-pathok-25',
    latitude: -7.7965,
    longitude: 110.3581,
    phone: '+62 274 414222',
    tags: ['kuliner', 'oleh-oleh', 'bakpia'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Bakpia Pathok 25',
        description: 'Toko bakpia terkenal dengan berbagai varian rasa dan kualitas terjaga.',
        address: 'Jl. Karel Sasuit Tubun, Ngampilan',
        category: 'Oleh-oleh',
        opening_hours: '08:00 - 20:00',
        price_range: 'Rp 20.000 - Rp 100.000'
      },
      'en-US': {
        name: 'Bakpia Pathok 25',
        description: 'Famous bakpia shop with various flavors and maintained quality.',
        address: 'Jl. Karel Sasuit Tubun, Ngampilan',
        category: 'Souvenirs',
        opening_hours: '08:00 AM - 8:00 PM',
        price_range: 'IDR 20,000 - IDR 100,000'
      }
    }
  },
  {
    slug: 'gerabah-kasongan',
    latitude: -7.8453,
    longitude: 110.3379,
    phone: '+62 274 567890',
    instagram: '@gerabahkasongan',
    facebook: 'gerabahkasongan',
    tags: ['gerabah', 'kerajinan', 'dekorasi'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Sentra Gerabah Kasongan',
        description: 'Kampung kerajinan gerabah dan keramik dengan berbagai produk berkualitas.',
        address: 'Kasongan, Bangunjiwo, Kasihan, Bantul',
        category: 'Kerajinan & Dekorasi',
        opening_hours: '08:00 - 17:00',
        price_range: 'Rp 20.000 - Rp 2.000.000'
      },
      'en-US': {
        name: 'Kasongan Pottery Center',
        description: 'Pottery and ceramics craft village with various quality products.',
        address: 'Kasongan, Bangunjiwo, Kasihan, Bantul',
        category: 'Crafts & Decoration',
        opening_hours: '08:00 AM - 5:00 PM',
        price_range: 'IDR 20,000 - IDR 2,000,000'
      }
    }
  },
  {
    slug: 'wayang-kulit-pak-tomo',
    latitude: -7.795,
    longitude: 110.37,
    phone: '+62 274 345678',
    whatsapp: '+62 814 5678 9012',
    tags: ['wayang', 'kerajinan', 'seni'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Wayang Kulit Pak Tomo',
        description: 'Pengrajin wayang kulit dengan keahlian tinggi, melayani pesanan custom dan souvenir.',
        address: 'Jl. Parangtritis Km 4.5, Brontokusuman',
        category: 'Seni & Kerajinan',
        opening_hours: '09:00 - 16:00',
        price_range: 'Rp 200.000 - Rp 5.000.000'
      },
      'en-US': {
        name: 'Pak Tomo Shadow Puppets',
        description: 'Shadow puppet craftsman with high expertise, serving custom orders and souvenirs.',
        address: 'Jl. Parangtritis Km 4.5, Brontokusuman',
        category: 'Arts & Crafts',
        opening_hours: '09:00 AM - 4:00 PM',
        price_range: 'IDR 200,000 - IDR 5,000,000'
      }
    }
  }
];

// Mock data for spot_nongkrong
const SPOT_NONGKRONG = [
  {
    slug: 'kopi-klotok-heritage',
    latitude: -7.6701,
    longitude: 110.4213,
    phone: '+62 812 9876 5432',
    instagram: '@kopiklotok',
    badges: ['Instagramable', 'View Bagus', 'Legendaris'],
    facilities: ['Parkir Luas', 'Toilet', 'Outdoor Seating', 'Wi-Fi'],
    tags: ['kopi', 'pemandangan', 'vintage'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Kopi Klotok Heritage',
        description: 'Cafe di alam terbuka dengan view pegunungan yang epic! Tempat legendaris dengan suasana vintage.',
        address: 'Pakem, Sleman',
        category: 'Coffee Shop',
        opening_hours: '07:00 - 22:00',
        price_range: 'Rp 15.000 - Rp 50.000'
      },
      'en-US': {
        name: 'Kopi Klotok Heritage',
        description: 'Open-air cafe with epic mountain views! Legendary spot with vintage atmosphere.',
        address: 'Pakem, Sleman',
        category: 'Coffee Shop',
        opening_hours: '07:00 AM - 10:00 PM',
        price_range: 'IDR 15,000 - IDR 50,000'
      }
    }
  },
  {
    slug: 'roaster-and-bear',
    latitude: -7.7844,
    longitude: 110.3670,
    instagram: '@roasterandbear',
    badges: ['Aesthetic', 'Live Music', 'Specialty Coffee'],
    facilities: ['Parkir', 'Toilet', 'Wi-Fi', 'Coworking Space'],
    tags: ['kopi', 'musik', 'modern'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Roaster & Bear',
        description: 'Hidden gem dengan vibe industrial aesthetic. Sering ada live music weekend!',
        address: 'Jl. Margo Utomo, Yogyakarta',
        category: 'Coffee Shop & Bar',
        opening_hours: '08:00 - 23:00',
        price_range: 'Rp 20.000 - Rp 60.000'
      },
      'en-US': {
        name: 'Roaster & Bear',
        description: 'Hidden gem with industrial aesthetic vibes. Live music on weekends!',
        address: 'Jl. Margo Utomo, Yogyakarta',
        category: 'Coffee Shop & Bar',
        opening_hours: '08:00 AM - 11:00 PM',
        price_range: 'IDR 20,000 - IDR 60,000'
      }
    }
  },
  {
    slug: 'the-westlake-resto',
    latitude: -7.7473,
    longitude: 110.3384,
    instagram: '@thewestlakejogja',
    badges: ['Sunset View', 'Romantic', 'Instagramable'],
    facilities: ['Parkir', 'Toilet', 'Outdoor Seating', 'Live Music'],
    tags: ['resto', 'sunset', 'danau'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'The Westlake Resto & Cafe',
        description: 'Cafe tepi danau dengan sunset view yang bikin feed IG kamu makin kece!',
        address: 'Sleman',
        category: 'Restaurant & Cafe',
        opening_hours: '10:00 - 22:00',
        price_range: 'Rp 30.000 - Rp 80.000'
      },
      'en-US': {
        name: 'The Westlake Resto & Cafe',
        description: 'Lakeside cafe with stunning sunset views that will level up your IG feed!',
        address: 'Sleman',
        category: 'Restaurant & Cafe',
        opening_hours: '10:00 AM - 10:00 PM',
        price_range: 'IDR 30,000 - IDR 80,000'
      }
    }
  },
  {
    slug: 'warung-bu-ageng',
    latitude: -7.8181,
    longitude: 110.3641,
    badges: ['Murah Meriah', 'Porsi Besar', 'Favorit Mahasiswa'],
    facilities: ['Parkir', 'Toilet'],
    tags: ['warung', 'murah', 'tradisional'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Warung Bu Ageng',
        description: 'Makan tradisional enak dengan harga mahasiswa banget. Porsi gede, rasa mantap!',
        address: 'Jl. Tirtodipuran No.13, Mantrijeron',
        category: 'Warung Makan',
        opening_hours: '10:00 - 21:00',
        price_range: 'Rp 10.000 - Rp 30.000'
      },
      'en-US': {
        name: 'Warung Bu Ageng',
        description: 'Delicious traditional food at student-friendly prices. Big portions, great taste!',
        address: 'Jl. Tirtodipuran No.13, Mantrijeron',
        category: 'Local Eatery',
        opening_hours: '10:00 AM - 9:00 PM',
        price_range: 'IDR 10,000 - IDR 30,000'
      }
    }
  },
  {
    slug: 'via-via-cafe',
    latitude: -7.7892,
    longitude: 110.3653,
    instagram: '@viaviacafe',
    badges: ['Traveler Friendly', 'International', 'Cozy'],
    facilities: ['Parkir', 'Toilet', 'Wi-Fi', 'Book Exchange'],
    tags: ['cafe', 'internasional', 'backpacker'],
    status: 'published',
    translations: {
      'id-ID': {
        name: 'Via Via Cafe',
        description: 'Cafe favorit backpacker dengan menu fusion dan suasana hangat. Ada book exchange!',
        address: 'Jl. Prawirotaman, Yogyakarta',
        category: 'Cafe & Restaurant',
        opening_hours: '08:00 - 23:00',
        price_range: 'Rp 25.000 - Rp 75.000'
      },
      'en-US': {
        name: 'Via Via Cafe',
        description: 'Backpacker favorite cafe with fusion menu and warm atmosphere. Has book exchange!',
        address: 'Jl. Prawirotaman, Yogyakarta',
        category: 'Cafe & Restaurant',
        opening_hours: '08:00 AM - 11:00 PM',
        price_range: 'IDR 25,000 - IDR 75,000'
      }
    }
  }
];

// Mock data for trending_articles
const TRENDING_ARTICLES = [
  {
    slug: 'sejarah-sumbu-filosofi-yogyakarta',
    views: 15420,
    published_date: '2025-11-15',
    tags: ['sejarah', 'budaya', 'warisan'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Sejarah Sumbu Filosofi Yogyakarta: Garis Imajiner Penghubung Gunung dan Laut',
        content: '<p>Sumbu Filosofi Yogyakarta adalah garis imajiner yang membentang dari Gunung Merapi di utara hingga Pantai Parangtritis di selatan, melewati Tugu Yogyakarta, Keraton, dan Panggung Krapyak.</p><p>Garis ini melambangkan perjalanan spiritual manusia dari kelahiran hingga kematian, serta hubungan harmonis antara manusia, alam, dan Sang Pencipta.</p>',
        excerpt: 'Memahami makna mendalam di balik garis imajiner yang menjadi jantung filosofi Keraton Yogyakarta.',
        author: 'Dr. Suwardi Endraswara',
        category: 'Sejarah & Budaya'
      },
      'en-US': {
        title: 'History of Yogyakarta Philosophical Axis: The Imaginary Line Connecting Mountain and Sea',
        content: '<p>The Yogyakarta Philosophical Axis is an imaginary line stretching from Mount Merapi in the north to Parangtritis Beach in the south, passing through Tugu Yogyakarta, the Palace, and Panggung Krapyak.</p><p>This line symbolizes the spiritual journey of humans from birth to death, and the harmonious relationship between humans, nature, and the Creator.</p>',
        excerpt: 'Understanding the deep meaning behind the imaginary line that forms the heart of Yogyakarta Palace philosophy.',
        author: 'Dr. Suwardi Endraswara',
        category: 'History & Culture'
      }
    }
  },
  {
    slug: 'tradisi-sekaten-jogja',
    views: 12350,
    published_date: '2025-10-20',
    tags: ['tradisi', 'religi', 'festival'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Tradisi Sekaten: Warisan Budaya Islam Jawa yang Masih Lestari',
        content: '<p>Sekaten adalah perayaan tahunan yang diadakan untuk memperingati Maulid Nabi Muhammad SAW. Tradisi ini sudah berlangsung sejak masa Kesultanan Demak dan diteruskan oleh Keraton Yogyakarta.</p><p>Puncak perayaan adalah Grebeg Maulud, dimana gunungan dibawa dari Keraton ke Masjid Gedhe Kauman.</p>',
        excerpt: 'Mengenal lebih dalam tradisi Sekaten yang menjadi simbol akulturasi Islam dan budaya Jawa.',
        author: 'Prof. Kuntowijoyo',
        category: 'Tradisi & Religi'
      },
      'en-US': {
        title: 'Sekaten Tradition: Preserved Javanese Islamic Cultural Heritage',
        content: '<p>Sekaten is an annual celebration held to commemorate the birthday of Prophet Muhammad. This tradition has been ongoing since the Demak Sultanate era and continued by the Yogyakarta Palace.</p><p>The celebration peaks at Grebeg Maulud, where gunungan (mountain-shaped offerings) are carried from the Palace to Gedhe Kauman Mosque.</p>',
        excerpt: 'Getting to know the Sekaten tradition that symbolizes the acculturation of Islam and Javanese culture.',
        author: 'Prof. Kuntowijoyo',
        category: 'Tradition & Religion'
      }
    }
  },
  {
    slug: 'kuliner-legendaris-jogja',
    views: 18760,
    published_date: '2025-12-01',
    tags: ['kuliner', 'wisata', 'rekomendasi'],
    status: 'published',
    translations: {
      'id-ID': {
        title: '10 Kuliner Legendaris Jogja yang Wajib Dicoba',
        content: '<p>Yogyakarta terkenal dengan kekayaan kulinernya. Dari gudeg yang manis hingga bakpia yang legendaris, setiap hidangan memiliki cerita dan filosofi tersendiri.</p><p>Artikel ini mengulas 10 kuliner legendaris yang sudah ada sejak puluhan tahun dan tetap menjaga kualitas serta cita rasanya.</p>',
        excerpt: 'Jelajahi warisan kuliner Yogyakarta yang sudah ada sejak puluhan tahun.',
        author: 'Bondan Winarno',
        category: 'Kuliner'
      },
      'en-US': {
        title: '10 Legendary Yogyakarta Culinary Must-Tries',
        content: '<p>Yogyakarta is famous for its culinary richness. From sweet gudeg to legendary bakpia, each dish has its own story and philosophy.</p><p>This article reviews 10 legendary cuisines that have existed for decades and continue to maintain their quality and taste.</p>',
        excerpt: 'Explore Yogyakarta culinary heritage that has existed for decades.',
        author: 'Bondan Winarno',
        category: 'Culinary'
      }
    }
  },
  {
    slug: 'spot-foto-instagramable-jogja',
    views: 22150,
    published_date: '2025-11-28',
    tags: ['wisata', 'foto', 'instagramable'],
    status: 'published',
    translations: {
      'id-ID': {
        title: '15 Spot Foto Instagramable di Jogja untuk Feed Kece',
        content: '<p>Yogyakarta tidak hanya kaya budaya, tapi juga memiliki banyak spot foto yang aesthetic. Dari bangunan heritage hingga cafe kekinian, semuanya cocok untuk konten media sosial.</p><p>Berikut adalah 15 spot yang paling recommended untuk hunting foto.</p>',
        excerpt: 'Temukan lokasi-lokasi terbaik untuk berfoto di Yogyakarta.',
        author: 'Tim Redaksi',
        category: 'Wisata'
      },
      'en-US': {
        title: '15 Instagramable Photo Spots in Jogja for Amazing Feed',
        content: '<p>Yogyakarta is not only rich in culture but also has many aesthetic photo spots. From heritage buildings to trendy cafes, everything is perfect for social media content.</p><p>Here are 15 most recommended spots for photo hunting.</p>',
        excerpt: 'Discover the best locations for taking photos in Yogyakarta.',
        author: 'Editorial Team',
        category: 'Tourism'
      }
    }
  },
  {
    slug: 'panduan-wisata-candi-prambanan',
    views: 9870,
    published_date: '2025-11-10',
    tags: ['candi', 'wisata', 'heritage'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Panduan Lengkap Wisata Candi Prambanan',
        content: '<p>Candi Prambanan adalah kompleks candi Hindu terbesar di Indonesia yang dibangun pada abad ke-9 Masehi. Situs Warisan Dunia UNESCO ini menyimpan keindahan arsitektur dan relief yang menakjubkan.</p><p>Panduan ini mencakup informasi tiket, waktu terbaik berkunjung, dan tips menikmati wisata.</p>',
        excerpt: 'Panduan lengkap untuk menjelajahi keagungan Candi Prambanan.',
        author: 'Dr. Timbul Haryono',
        category: 'Wisata Heritage'
      },
      'en-US': {
        title: 'Complete Guide to Prambanan Temple Tourism',
        content: '<p>Prambanan Temple is the largest Hindu temple complex in Indonesia, built in the 9th century AD. This UNESCO World Heritage Site contains stunning architectural beauty and amazing reliefs.</p><p>This guide covers ticket information, best time to visit, and tips for enjoying the tour.</p>',
        excerpt: 'Complete guide to exploring the grandeur of Prambanan Temple.',
        author: 'Dr. Timbul Haryono',
        category: 'Heritage Tourism'
      }
    }
  }
];

// Mock data for encyclopedia_entries
const ENCYCLOPEDIA_ENTRIES = [
  {
    slug: 'keraton-ngayogyakarta',
    tags: ['keraton', 'heritage', 'kesultanan'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Keraton Ngayogyakarta Hadiningrat',
        content: '<p>Keraton Ngayogyakarta Hadiningrat adalah istana resmi Kesultanan Ngayogyakarta yang didirikan oleh Sultan Hamengku Buwono I pada tahun 1755 setelah Perjanjian Giyanti.</p><p>Keraton tidak hanya berfungsi sebagai tempat tinggal Sultan, tetapi juga sebagai pusat pemerintahan, kebudayaan, dan spiritual masyarakat Yogyakarta.</p><p>Kompleks keraton meliputi berbagai bangsal dengan fungsi berbeda, museum, dan area pertunjukan seni tradisional.</p>',
        summary: 'Istana resmi Kesultanan Yogyakarta yang menjadi pusat kebudayaan Jawa.'
      },
      'en-US': {
        title: 'Ngayogyakarta Hadiningrat Palace',
        content: '<p>Ngayogyakarta Hadiningrat Palace is the official palace of the Yogyakarta Sultanate, founded by Sultan Hamengku Buwono I in 1755 after the Treaty of Giyanti.</p><p>The palace not only serves as the Sultan\'s residence but also as the center of government, culture, and spirituality of Yogyakarta society.</p><p>The palace complex includes various pavilions with different functions, museums, and traditional art performance areas.</p>',
        summary: 'The official palace of Yogyakarta Sultanate that serves as the center of Javanese culture.'
      }
    }
  },
  {
    slug: 'batik-yogyakarta',
    tags: ['batik', 'kerajinan', 'unesco'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Batik Yogyakarta',
        content: '<p>Batik Yogyakarta adalah salah satu warisan budaya Indonesia yang telah diakui UNESCO sebagai Warisan Kemanusiaan untuk Budaya Lisan dan Nonbendawi.</p><p>Batik Jogja memiliki ciri khas warna sogan (coklat) dan biru indigo dengan motif-motif klasik seperti parang, kawung, dan truntum yang memiliki makna filosofis mendalam.</p><p>Setiap motif batik keraton memiliki aturan pemakaian berdasarkan status sosial pemakainya.</p>',
        summary: 'Warisan budaya berupa kain bermotif dengan teknik pewarnaan tradisional yang diakui UNESCO.'
      },
      'en-US': {
        title: 'Yogyakarta Batik',
        content: '<p>Yogyakarta Batik is one of Indonesia\'s cultural heritages recognized by UNESCO as Intangible Cultural Heritage of Humanity.</p><p>Jogja batik is characterized by sogan (brown) and indigo blue colors with classical motifs such as parang, kawung, and truntum that have deep philosophical meanings.</p><p>Each palace batik motif has usage rules based on the wearer\'s social status.</p>',
        summary: 'Cultural heritage of patterned cloth with traditional dyeing techniques recognized by UNESCO.'
      }
    }
  },
  {
    slug: 'gamelan-jawa',
    tags: ['gamelan', 'musik', 'seni'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Gamelan Jawa',
        content: '<p>Gamelan adalah ansambel musik tradisional Jawa yang terdiri dari berbagai instrumen perkusi logam seperti gong, kenong, saron, dan bonang.</p><p>Dalam konteks Yogyakarta, gamelan tidak hanya berfungsi sebagai hiburan tetapi juga sebagai bagian penting dari upacara keagamaan dan tradisi keraton.</p><p>Laras gamelan Jawa terdiri dari pelog (tujuh nada) dan slendro (lima nada) yang menciptakan karakteristik suara yang khas.</p>',
        summary: 'Ansambel musik tradisional Jawa dengan instrumen perkusi logam.'
      },
      'en-US': {
        title: 'Javanese Gamelan',
        content: '<p>Gamelan is a traditional Javanese musical ensemble consisting of various metal percussion instruments such as gong, kenong, saron, and bonang.</p><p>In the Yogyakarta context, gamelan not only serves as entertainment but also as an important part of religious ceremonies and palace traditions.</p><p>Javanese gamelan tuning consists of pelog (seven notes) and slendro (five notes) which create distinctive sound characteristics.</p>',
        summary: 'Traditional Javanese musical ensemble with metal percussion instruments.'
      }
    }
  },
  {
    slug: 'wayang-kulit',
    tags: ['wayang', 'seni', 'pertunjukan'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Wayang Kulit',
        content: '<p>Wayang kulit adalah bentuk teater bayangan tradisional yang menggunakan boneka pipih dari kulit kerbau yang dipahat dan dicat dengan teliti.</p><p>Pertunjukan wayang biasanya menceritakan epik Ramayana atau Mahabharata dengan dalang sebagai pencerita utama yang menggerakkan wayang dan memberikan dialog.</p><p>Wayang kulit Yogyakarta memiliki ciri khas bentuk yang lebih halus dan gerakan yang lebih lemah gemulai dibanding gaya Surakarta.</p>',
        summary: 'Teater bayangan tradisional dengan boneka kulit yang diakui UNESCO.'
      },
      'en-US': {
        title: 'Shadow Puppet (Wayang Kulit)',
        content: '<p>Wayang kulit is a traditional shadow theater form using flat puppets made from carefully carved and painted buffalo leather.</p><p>Wayang performances usually tell the Ramayana or Mahabharata epics with the dalang (puppeteer) as the main narrator who moves the puppets and provides dialogue.</p><p>Yogyakarta wayang kulit has characteristics of more refined forms and more gentle movements compared to Surakarta style.</p>',
        summary: 'Traditional shadow theater with leather puppets recognized by UNESCO.'
      }
    }
  },
  {
    slug: 'tugu-yogyakarta',
    tags: ['tugu', 'monument', 'landmark'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Tugu Yogyakarta',
        content: '<p>Tugu Yogyakarta adalah monumen bersejarah yang dibangun oleh Sultan Hamengku Buwono I sebagai bagian dari Sumbu Filosofi Yogyakarta.</p><p>Tugu ini melambangkan manunggaling kawula gusti (persatuan rakyat dengan raja) dan menjadi salah satu landmark paling ikonik di Yogyakarta.</p><p>Bentuk tugu mengalami perubahan dari silinder dengan lingga-yoni di puncak menjadi bentuk obelisk setelah gempa 1867.</p>',
        summary: 'Monumen bersejarah yang menjadi landmark ikonik dan bagian dari Sumbu Filosofi.'
      },
      'en-US': {
        title: 'Yogyakarta Monument (Tugu)',
        content: '<p>Yogyakarta Monument is a historical monument built by Sultan Hamengku Buwono I as part of the Yogyakarta Philosophical Axis.</p><p>The monument symbolizes manunggaling kawula gusti (unity of the people with the king) and has become one of the most iconic landmarks in Yogyakarta.</p><p>The monument\'s shape changed from a cylinder with lingga-yoni at the top to an obelisk form after the 1867 earthquake.</p>',
        summary: 'Historical monument that serves as an iconic landmark and part of the Philosophical Axis.'
      }
    }
  },
  {
    slug: 'malioboro',
    tags: ['malioboro', 'wisata', 'belanja'],
    status: 'published',
    translations: {
      'id-ID': {
        title: 'Jalan Malioboro',
        content: '<p>Malioboro adalah jalan utama di pusat kota Yogyakarta yang membentang sekitar 1 km dari Tugu Yogyakarta hingga Pasar Beringharjo.</p><p>Nama Malioboro konon berasal dari Marlborough, merujuk pada Duke of Marlborough atau dari bahasa Sansekerta "Malyabhara" yang berarti rangkaian bunga.</p><p>Jalan ini terkenal sebagai pusat wisata belanja dengan deretan toko, hotel, dan pedagang kaki lima yang menjual berbagai cinderamata khas Jogja.</p>',
        summary: 'Jalan legendaris di pusat kota Yogyakarta yang menjadi ikon wisata belanja.'
      },
      'en-US': {
        title: 'Malioboro Street',
        content: '<p>Malioboro is the main street in downtown Yogyakarta stretching about 1 km from Yogyakarta Monument to Beringharjo Market.</p><p>The name Malioboro supposedly comes from Marlborough, referring to the Duke of Marlborough, or from Sanskrit "Malyabhara" meaning flower garland.</p><p>This street is famous as a shopping tourism center with rows of shops, hotels, and street vendors selling various Jogja souvenirs.</p>',
        summary: 'Legendary street in downtown Yogyakarta that serves as an iconic shopping tourism destination.'
      }
    }
  }
];

async function importData() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  console.log('=== IMPORTING MOCK DATA WITH TRANSLATIONS ===\n');

  // Helper function to import collection with translations
  async function importCollection(tableName, data, translationsTable, fkField, mainFields, transFields) {
    console.log(`\n📦 Importing ${tableName}...\n`);

    let imported = 0;
    let skipped = 0;

    for (const item of data) {
      // Check if already exists
      const existing = await client.query(
        `SELECT id FROM ${tableName} WHERE slug = $1`,
        [item.slug]
      );

      if (existing.rows.length > 0) {
        console.log(`  ⚠️ Skipped (exists): ${item.slug}`);
        skipped++;
        continue;
      }

      // Build main table insert
      const mainValues = {};
      for (const field of mainFields) {
        if (item[field] !== undefined) {
          mainValues[field] = Array.isArray(item[field]) ? JSON.stringify(item[field]) : item[field];
        }
      }

      const mainColumns = Object.keys(mainValues);
      const mainPlaceholders = mainColumns.map((_, i) => `$${i + 1}`);

      const result = await client.query(
        `INSERT INTO ${tableName} (${mainColumns.join(', ')}) VALUES (${mainPlaceholders.join(', ')}) RETURNING id`,
        Object.values(mainValues)
      );

      const newId = result.rows[0].id;

      // Insert translations
      for (const [code, trans] of Object.entries(item.translations)) {
        const transValues = { [fkField]: newId, code };
        for (const field of transFields) {
          if (trans[field] !== undefined) {
            transValues[field] = trans[field];
          }
        }

        const transColumns = Object.keys(transValues);
        const transPlaceholders = transColumns.map((_, i) => `$${i + 1}`);

        await client.query(
          `INSERT INTO ${translationsTable} (${transColumns.join(', ')}) VALUES (${transPlaceholders.join(', ')})`,
          Object.values(transValues)
        );
      }

      console.log(`  ✅ Imported: ${item.slug} (id: ${newId})`);
      imported++;
    }

    console.log(`\n  📊 ${tableName}: ${imported} imported, ${skipped} skipped`);
  }

  try {
    // Import agenda_events
    await importCollection(
      'agenda_events',
      AGENDA_EVENTS,
      'agenda_events_translations',
      'agenda_events_id',
      ['slug', 'event_date', 'start_time', 'end_time', 'latitude', 'longitude', 'tags', 'status'],
      ['title', 'description', 'location', 'organizer', 'ticket_price']
    );

    // Import umkm_lokal
    await importCollection(
      'umkm_lokal',
      UMKM_LOKAL,
      'umkm_lokal_translations',
      'umkm_lokal_id',
      ['slug', 'latitude', 'longitude', 'phone', 'whatsapp', 'instagram', 'facebook', 'website', 'tags', 'status'],
      ['name', 'description', 'address', 'category', 'opening_hours', 'price_range']
    );

    // Import spot_nongkrong
    await importCollection(
      'spot_nongkrong',
      SPOT_NONGKRONG,
      'spot_nongkrong_translations',
      'spot_nongkrong_id',
      ['slug', 'latitude', 'longitude', 'phone', 'instagram', 'badges', 'facilities', 'tags', 'status'],
      ['name', 'description', 'address', 'category', 'opening_hours', 'price_range']
    );

    // Import trending_articles
    await importCollection(
      'trending_articles',
      TRENDING_ARTICLES,
      'trending_articles_translations',
      'trending_articles_id',
      ['slug', 'views', 'published_date', 'tags', 'status'],
      ['title', 'content', 'excerpt', 'author', 'category']
    );

    // Import encyclopedia_entries
    await importCollection(
      'encyclopedia_entries',
      ENCYCLOPEDIA_ENTRIES,
      'encyclopedia_entries_translations',
      'encyclopedia_entries_id',
      ['slug', 'tags', 'status'],
      ['title', 'content', 'summary']
    );

    console.log('\n=== VERIFICATION ===\n');

    // Verify counts
    const collections = [
      'agenda_events',
      'umkm_lokal',
      'spot_nongkrong',
      'trending_articles',
      'encyclopedia_entries'
    ];

    for (const col of collections) {
      const count = await client.query(`SELECT COUNT(*) FROM ${col}`);
      const transCount = await client.query(`SELECT COUNT(*) FROM ${col}_translations`);
      console.log(`${col}: ${count.rows[0].count} items, ${transCount.rows[0].count} translations`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }

  await client.end();
  console.log('\n✅ Done! Restart Directus to see changes.');
}

importData().catch(console.error);
