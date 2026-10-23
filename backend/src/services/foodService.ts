export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  isVeg: boolean;
  rating: number;
  image: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  deliveryTimeMins: number;
  priceForTwo: number;
  address: string;
  lat: number;
  lng: number;
  image: string;
  isPromoted?: boolean;
  menu: MenuItem[];
}

export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY_FOR_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
}

export interface FoodOrder {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  customerLat: number;
  customerLng: number;
  restaurantId: string;
  restaurantName: string;
  restaurantLat: number;
  restaurantLng: number;
  items: OrderItem[];
  itemTotal: number;
  deliveryFee: number;
  taxes: number;
  grandTotal: number;
  status: OrderStatus;
  paymentMode: 'ONLINE';
  paymentApp: string;
  isPrepaid: boolean;
  txnRef: string;
  deliveryPartner?: {
    id: string;
    name: string;
    phone: string;
    vehicleNumber?: string;
    rating?: number;
    currentLat: number;
    currentLng: number;
  };
  otp: string;
  photoProofUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: "rest_1",
    name: "Minerva Grand (MG Road, Vijayawada)",
    cuisine: "Hyderabadi Biryani, Andhra Spices, Starters",
    rating: 4.8,
    reviewCount: 3840,
    deliveryTimeMins: 25,
    priceForTwo: 500,
    address: "MG Road, Benz Circle Area, Vijayawada",
    lat: 16.5028,
    lng: 80.6465,
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60",
    isPromoted: true,
    menu: [
      {
        id: "m_101",
        name: "Meghana Special Chicken Biryani",
        price: 340,
        description: "Signature aromatic basmati rice layered with spicy chicken chunks, roasted Andhra spices, and caramelized onions.",
        category: "Biryani",
        isVeg: false,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_102",
        name: "Paneer Butter Masala Biryani",
        price: 290,
        description: "Fragrant saffron basmati rice topped with golden seared paneer cubes simmered in buttery makhani gravy.",
        category: "Biryani",
        isVeg: true,
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_103",
        name: "Chicken 65 Andhra Style",
        price: 260,
        description: "Crispy double-fried chicken chunks tossed with curry leaves, slit green chillies, garlic paste, and tangy spices.",
        category: "Starters",
        isVeg: false,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_8",
    name: "Paradise Biryani (World Famous)",
    cuisine: "Authentic Hyderabadi Dum Biryani, Kebabs, Desserts",
    rating: 4.9,
    reviewCount: 14200,
    deliveryTimeMins: 22,
    priceForTwo: 550,
    address: "MG Road & Benz Circle Hub, Vijayawada",
    lat: 16.5045,
    lng: 80.6480,
    image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&auto=format&fit=crop&q=60",
    isPromoted: true,
    menu: [
      {
        id: "m_801",
        name: "Paradise Royal Chicken Dum Biryani",
        price: 360,
        description: "World famous slow-cooked chicken dum biryani in earthen handi infused with saffron, cardamom, and fried onions.",
        category: "Biryani",
        isVeg: false,
        rating: 5.0,
        image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_802",
        name: "Nizami Mutton Dum Biryani",
        price: 430,
        description: "Tender spring lamb marinated in kachhi dum style, slow-steamed over coals with long-grain aged basmati.",
        category: "Biryani",
        isVeg: false,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_803",
        name: "Chicken Tikka Kebab (6 Pcs)",
        price: 290,
        description: "Boneless chicken cubes marinated in tandoori yoghurt masala, charred to perfection in clay oven.",
        category: "Kebabs",
        isVeg: false,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_804",
        name: "Authentic Double Ka Meetha",
        price: 130,
        description: "Traditional Hyderabadi fried bread pudding soaked in saffron cardamom rabri with pistachio slivers.",
        category: "Desserts",
        isVeg: true,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_9",
    name: "Nagarjuna Andhra Meals & Biryanis",
    cuisine: "Andhra Bhojanam, Guntur Curries, Seafood, Meals",
    rating: 4.8,
    reviewCount: 8900,
    deliveryTimeMins: 28,
    priceForTwo: 600,
    address: "Residency Road & Central Corridor",
    lat: 16.5080,
    lng: 80.6410,
    image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&auto=format&fit=crop&q=60",
    menu: [
      {
        id: "m_901",
        name: "Nagarjuna Royal Andhra Bhojanam Thali",
        price: 270,
        description: "Full traditional meal with hot rice, Gunpowder (Podi), Pure Ghee, Sambar, Rasam, Majjiga Pulusu, Papad & Payasam.",
        category: "Andhra Meals",
        isVeg: true,
        rating: 5.0,
        image: "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_902",
        name: "Guntur Fiery Chicken Curry",
        price: 320,
        description: "Authentic spicy Andhra chicken curry simmered with crushed Guntur red chillies, coriander seed paste and curry leaves.",
        category: "Main Course",
        isVeg: false,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_903",
        name: "Gongura Mutton Masala",
        price: 410,
        description: "Tender goat meat slow cooked with tangy sorrel (Gongura) leaves and freshly ground spices.",
        category: "Main Course",
        isVeg: false,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1545247181-516773cae754?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_904",
        name: "Royyala Iguru (Andhra Prawn Fry)",
        price: 380,
        description: "Fresh coastal prawns semi-gravy fry tossed with shallots, crushed black pepper, green chillies, and curry leaves.",
        category: "Starters",
        isVeg: false,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_10",
    name: "Domino's Gourmet Pizza & Sides",
    cuisine: "Italian, Hand-Tossed Pizzas, Stuffed Garlic Bread, Pasta",
    rating: 4.7,
    reviewCount: 11200,
    deliveryTimeMins: 20,
    priceForTwo: 450,
    address: "Governorpet & MG Road Junction, Vijayawada",
    lat: 16.5120,
    lng: 80.6320,
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60",
    isPromoted: true,
    menu: [
      {
        id: "m_1001",
        name: "Farmhouse Gourmet Cheese Pizza",
        price: 390,
        description: "Hand-tossed crust loaded with crisp capsicum, juicy tomatoes, grilled mushrooms, black olives, and 100% mozzarella.",
        category: "Pizzas",
        isVeg: true,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_1002",
        name: "Pepper Barbecue Chicken Pizza",
        price: 440,
        description: "Succulent barbecue chicken shreds, fiery red paprika, sliced onions, and gooey molten cheese on crisp base.",
        category: "Pizzas",
        isVeg: false,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_1003",
        name: "Cheesy Stuffed Garlic Breadsticks",
        price: 160,
        description: "Freshly baked garlic loaf stuffed with molten mozzarella cheese and sweet corn kernels, seasoned with oregano.",
        category: "Sides",
        isVeg: true,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1573821663912-569905455b1c?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_1004",
        name: "Molten Choco Lava Cake",
        price: 110,
        description: "Warm chocolate cake shell with rich, bubbling gooey chocolate ganache oozing from the center.",
        category: "Desserts",
        isVeg: true,
        rating: 5.0,
        image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_11",
    name: "Bawarchi Royal Biryani (RTC X Roads)",
    cuisine: "Hyderabadi Biryani, Tandoori Kebabs, Mughlai Curries",
    rating: 4.8,
    reviewCount: 16500,
    deliveryTimeMins: 25,
    priceForTwo: 500,
    address: "Bawarchi Square, Eluru Road, Vijayawada",
    lat: 16.5160,
    lng: 80.6270,
    image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=60",
    menu: [
      {
        id: "m_1101",
        name: "Bawarchi Special Mutton Dum Biryani",
        price: 390,
        description: "The legendary Hyderabadi mutton dum biryani cooked with secret potli masala and long basmati grains.",
        category: "Biryani",
        isVeg: false,
        rating: 5.0,
        image: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_1102",
        name: "Tandoori Chicken Boti Kebab",
        price: 310,
        description: "Charcoal grilled spiced mutton and chicken boti skewers served with mint chutney and onion rings.",
        category: "Kebabs",
        isVeg: false,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_1103",
        name: "Butter Chicken Reshmi Gravy with Rumali Roti",
        price: 290,
        description: "Velvety butter gravy with smoked boneless chicken chunks served with 2 freshly tossed paper-thin Rumali Rotis.",
        category: "Main Course",
        isVeg: false,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_12",
    name: "Wow! Momo & Tibetan Kitchen",
    cuisine: "Tibetan Momos, Szechuan Platters, Thukpa, Bao",
    rating: 4.7,
    reviewCount: 6300,
    deliveryTimeMins: 20,
    priceForTwo: 350,
    address: "PVP Square Mall Food Court, Vijayawada",
    lat: 16.5050,
    lng: 80.6510,
    image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&auto=format&fit=crop&q=60",
    menu: [
      {
        id: "m_1201",
        name: "Darjeeling Steamed Chicken Momos (8 Pcs)",
        price: 210,
        description: "Juicy minced chicken, scallions, and mountain herbs encased in thin steamed dough with spicy red chilli garlic chutney.",
        category: "Momos",
        isVeg: false,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_1202",
        name: "Pan Fried Szechuan Veg Momos (8 Pcs)",
        price: 190,
        description: "Crispy pan-seared vegetable momos tossed in hot spicy sweet Szechuan sauce with bell peppers.",
        category: "Momos",
        isVeg: true,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_1203",
        name: "Crispy Fried Paneer Kurkure Momos",
        price: 220,
        description: "Crunchy crumb-coated paneer momos deep fried to golden perfection, served with mint mayo dip.",
        category: "Momos",
        isVeg: true,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_13",
    name: "Haldiram's Sweets, Chaats & Thali",
    cuisine: "North Indian, Pure Desi Ghee Sweets, Delhi Chaats, Thali",
    rating: 4.8,
    reviewCount: 9100,
    deliveryTimeMins: 22,
    priceForTwo: 400,
    address: "Besant Road & Governorpet Market, Vijayawada",
    lat: 16.5135,
    lng: 80.6295,
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=60",
    menu: [
      {
        id: "m_1301",
        name: "Special Delhi Chole Bhature with Pickle",
        price: 180,
        description: "Two jumbo fluffy golden bhatures served with spicy pindi chole, pickled green chillies, and sliced onions.",
        category: "North Indian",
        isVeg: true,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_1302",
        name: "Raj Kachori Royal Chaat",
        price: 160,
        description: "Crispy giant kachori filled with spiced potatoes, sprouts, sweetened curd, tamarind chutney, and pomegranate seeds.",
        category: "Chaats",
        isVeg: true,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_1303",
        name: "Kaju Katli Premium Box (250g)",
        price: 260,
        description: "Silky melt-in-the-mouth diamond cashewnut fudge layered with edible silver leaf.",
        category: "Sweets",
        isVeg: true,
        rating: 5.0,
        image: "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_2",
    name: "Truffles Gourmet Burgers & Cafe",
    cuisine: "American, Gourmet Burgers, Loaded Fries, Shakes",
    rating: 4.7,
    reviewCount: 5210,
    deliveryTimeMins: 30,
    priceForTwo: 450,
    address: "100ft Road, Indiranagar, Bangalore",
    lat: 12.9784,
    lng: 77.6408,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60",
    menu: [
      {
        id: "m_201",
        name: "All-Star Cheese & Bacon Burger",
        price: 280,
        description: "Char-grilled patty with melted aged cheddar, smoked bacon, caramelized shallots, and house cocktail glaze on toasted brioche.",
        category: "Burgers",
        isVeg: false,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_203",
        name: "Loaded Truffle Cheese Fries",
        price: 180,
        description: "Crispy golden french fries drizzled with aromatic white truffle oil, sea salt, and molten cheddar cheese sauce.",
        category: "Sides",
        isVeg: true,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_204",
        name: "Ferrero Rocher Thick Shake",
        price: 210,
        description: "Creamy Belgian chocolate gelato blended with roasted hazelnuts, Nutella fudge, and crunchy chocolate wafers.",
        category: "Beverages",
        isVeg: true,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_3",
    name: "Corner House Ice Creams",
    cuisine: "Desserts, Belgian Sundaes, Thick Shakes",
    rating: 4.9,
    reviewCount: 6890,
    deliveryTimeMins: 20,
    priceForTwo: 300,
    address: "5th Block, Koramangala, Bangalore",
    lat: 12.9352,
    lng: 77.6245,
    image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=60",
    isPromoted: true,
    menu: [
      {
        id: "m_301",
        name: "Death By Chocolate (DBC)",
        price: 260,
        description: "Freshly baked rich chocolate brownie cake topped with double vanilla scoops, bubbling hot chocolate fudge, and honey-roasted peanuts.",
        category: "Desserts",
        isVeg: true,
        rating: 5.0,
        image: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_302",
        name: "Hot Chocolate Fudge Sundae",
        price: 190,
        description: "Double scoops of Madagascar vanilla ice cream generously smothered in warm homemade dark chocolate fudge and roasted cashew halves.",
        category: "Desserts",
        isVeg: true,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_4",
    name: "Vidyarthi Bhavan Heritage (Est. 1943)",
    cuisine: "South Indian, Heritage Dosas, Filter Coffee, Tiffins",
    rating: 4.9,
    reviewCount: 9420,
    deliveryTimeMins: 20,
    priceForTwo: 200,
    address: "Gandhi Bazaar, Basavanagudi, Bangalore",
    lat: 12.9438,
    lng: 77.5738,
    image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=500&auto=format&fit=crop&q=60",
    menu: [
      {
        id: "m_401",
        name: "Crispy Desi Ghee Masala Dosa",
        price: 95,
        description: "Classic thick and crispy dosa roasted in pure desi ghee, layered with spicy red garlic chutney and seasoned potato palya.",
        category: "South Indian",
        isVeg: true,
        rating: 5.0,
        image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_403",
        name: "Authentic Degree Filter Coffee",
        price: 45,
        description: "Freshly brewed dark-roast Chicory coffee decoction frothed with boiled whole milk in traditional brass dabarah.",
        category: "Beverages",
        isVeg: true,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_5",
    name: "Empire Restaurant (Shivajinagar)",
    cuisine: "Mughlai, Tandoor, Coin Parotta, Ghee Roast, Shawarma",
    rating: 4.6,
    reviewCount: 7890,
    deliveryTimeMins: 30,
    priceForTwo: 550,
    address: "Church Street & Central Bangalore",
    lat: 12.9748,
    lng: 77.6047,
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60",
    menu: [
      {
        id: "m_501",
        name: "Empire Special Butter Chicken",
        price: 310,
        description: "Charcoal-tandoor roasted chicken pieces simmered in silky tomato, cashew nut makhani gravy with fenugreek and butter.",
        category: "North Indian",
        isVeg: false,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_502",
        name: "Coin Parotta (3 Pcs) with Ghee Gravy",
        price: 140,
        description: "Flaky multi-layered Malabar parottas hand-beaten on hot tawa, served with spicy Kundapura ghee roast gravy.",
        category: "Main Course",
        isVeg: true,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_6",
    name: "Punjab Grill Royal Kitchen",
    cuisine: "North Indian, Dal Makhani, Paneer Tikka, Tandoor Breads",
    rating: 4.8,
    reviewCount: 4120,
    deliveryTimeMins: 35,
    priceForTwo: 700,
    address: "UB City, Vittal Mallya Road, Bangalore",
    lat: 12.9719,
    lng: 77.5960,
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=60",
    menu: [
      {
        id: "m_601",
        name: "Dal Makhani Bukhara Style",
        price: 280,
        description: "Black whole urad lentils and kidney beans slow-simmered for 18 hours over charcoal with white butter and fresh cream.",
        category: "North Indian",
        isVeg: true,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_602",
        name: "Paneer Tikka Angaare",
        price: 290,
        description: "Fresh malai paneer cubes marinated with Kashmiri deghi mirch, ajwain, mustard oil, and smoked in tandoor with bell peppers.",
        category: "Starters",
        isVeg: true,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_604",
        name: "Garlic Butter Naan",
        price: 70,
        description: "Tandoor baked refined wheat bread brushed with golden garlic butter and chopped coriander.",
        category: "Breads",
        isVeg: true,
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300&auto=format&fit=crop&q=60"
      }
    ]
  },
  {
    id: "rest_7",
    name: "Mainland China & Wok Express",
    cuisine: "Chinese, Pan-Asian, Dimsums, Hakka Noodles",
    rating: 4.7,
    reviewCount: 3650,
    deliveryTimeMins: 30,
    priceForTwo: 600,
    address: "Church Street, MG Road, Bangalore",
    lat: 12.9740,
    lng: 77.6085,
    image: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&auto=format&fit=crop&q=60",
    menu: [
      {
        id: "m_701",
        name: "Schezwan Chilli Garlic Hakka Noodles",
        price: 240,
        description: "Wok-tossed hand-pulled noodles with crunchy shredded vegetables, crushed garlic, and fiery Sichuan red chilli oil.",
        category: "Chinese",
        isVeg: true,
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=300&auto=format&fit=crop&q=60"
      },
      {
        id: "m_703",
        name: "Steamed Chicken Dimsums (6 Pcs)",
        price: 260,
        description: "Translucent dumplings filled with minced ginger-scallion chicken and sesame oil, served with spicy chilli-chive dip.",
        category: "Starters",
        isVeg: false,
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=300&auto=format&fit=crop&q=60"
      }
    ]
  }
];

const INITIAL_KITCHEN_ORDERS: FoodOrder[] = [
  {
    id: "order_101",
    customerId: "usr_harsha",
    customerName: "Harsha Reddy",
    customerPhone: "+91 8520079100",
    deliveryAddress: "Vijayawada Railway Station, Vijayawada",
    customerLat: 16.5186,
    customerLng: 80.6200,
    restaurantId: "rest_1",
    restaurantName: "Minerva Grand (MG Road, Vijayawada)",
    restaurantLat: 16.5028,
    restaurantLng: 80.6465,
    items: [
      { itemId: "m_101", name: "Meghana Special Chicken Biryani", price: 340, quantity: 1, isVeg: false },
      { itemId: "m_103", name: "Chicken 65 Andhra Style", price: 260, quantity: 1, isVeg: false }
    ],
    itemTotal: 600,
    deliveryFee: 0,
    taxes: 30,
    grandTotal: 630,
    status: 'PREPARING',
    paymentMode: 'ONLINE',
    paymentApp: 'Google Pay (GPay)',
    isPrepaid: true,
    txnRef: 'UPI-FD9821852001',
    deliveryPartner: {
      id: "dp_ramesh",
      name: "Ramesh Kumar (Bike)",
      phone: "+91 9876543211",
      vehicleNumber: "AP-16-FD-5821",
      rating: 4.9,
      currentLat: 16.5020,
      currentLng: 80.6450
    },
    otp: "4821",
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60000).toISOString()
  },
  {
    id: "order_102",
    customerId: "usr_rahul",
    customerName: "Rahul Mehta",
    customerPhone: "+91 9876543201",
    deliveryAddress: "Defence Colony, Indiranagar, Bangalore",
    customerLat: 12.9770,
    customerLng: 77.6380,
    restaurantId: "rest_2",
    restaurantName: "Truffles Gourmet Burgers & Cafe",
    restaurantLat: 12.9784,
    restaurantLng: 77.6408,
    items: [
      { itemId: "m_201", name: "All-Star Cheese & Bacon Burger", price: 280, quantity: 2, isVeg: false },
      { itemId: "m_203", name: "Loaded Truffle Cheese Fries", price: 180, quantity: 1, isVeg: true },
      { itemId: "m_204", name: "Ferrero Rocher Thick Shake", price: 210, quantity: 1, isVeg: true }
    ],
    itemTotal: 950,
    deliveryFee: 0,
    taxes: 48,
    grandTotal: 998,
    status: 'ACCEPTED',
    paymentMode: 'ONLINE',
    paymentApp: 'PhonePe UPI',
    isPrepaid: true,
    txnRef: 'UPI-FD4410987654',
    deliveryPartner: {
      id: "dp_ramesh",
      name: "Ramesh Kumar (Bike)",
      phone: "+91 9876543211",
      vehicleNumber: "AP-16-FD-5821",
      rating: 4.9,
      currentLat: 12.9775,
      currentLng: 77.6400
    },
    otp: "5912",
    createdAt: new Date(Date.now() - 6 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60000).toISOString()
  },
  {
    id: "order_103",
    customerId: "usr_priya",
    customerName: "Priya Sharma",
    customerPhone: "+91 9876543202",
    deliveryAddress: "4th Block, Koramangala, Bangalore",
    customerLat: 12.9340,
    customerLng: 77.6220,
    restaurantId: "rest_3",
    restaurantName: "Corner House Ice Creams",
    restaurantLat: 12.9352,
    restaurantLng: 77.6245,
    items: [
      { itemId: "m_301", name: "Death By Chocolate (DBC)", price: 260, quantity: 2, isVeg: true },
      { itemId: "m_302", name: "Hot Chocolate Fudge Sundae", price: 190, quantity: 1, isVeg: true }
    ],
    itemTotal: 710,
    deliveryFee: 0,
    taxes: 35,
    grandTotal: 745,
    status: 'READY_FOR_PICKUP',
    paymentMode: 'ONLINE',
    paymentApp: 'HDFC Debit Card',
    isPrepaid: true,
    txnRef: 'TXN-FD-CRD-88219012',
    deliveryPartner: {
      id: "dp_suresh",
      name: "Suresh Gowda (Auto)",
      phone: "+91 9876543212",
      vehicleNumber: "KA-01-FD-3124",
      rating: 4.8,
      currentLat: 12.9348,
      currentLng: 77.6240
    },
    otp: "7134",
    createdAt: new Date(Date.now() - 14 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60000).toISOString()
  },
  {
    id: "order_104",
    customerId: "usr_anand",
    customerName: "Anand Varma",
    customerPhone: "+91 9876543203",
    deliveryAddress: "Basavanagudi, Bangalore",
    customerLat: 12.9420,
    customerLng: 77.5740,
    restaurantId: "rest_4",
    restaurantName: "Vidyarthi Bhavan Heritage (Est. 1943)",
    restaurantLat: 12.9405,
    restaurantLng: 77.5738,
    items: [
      { itemId: "m_401", name: "Crispy Desi Ghee Masala Dosa", price: 95, quantity: 3, isVeg: true },
      { itemId: "m_403", name: "Authentic Degree Filter Coffee", price: 45, quantity: 2, isVeg: true }
    ],
    itemTotal: 375,
    deliveryFee: 35,
    taxes: 19,
    grandTotal: 429,
    status: 'PREPARING',
    paymentMode: 'ONLINE',
    paymentApp: 'Paytm UPI',
    isPrepaid: true,
    txnRef: 'UPI-FD2289987654',
    otp: "2289",
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60000).toISOString()
  },
  {
    id: "order_105",
    customerId: "usr_karthik",
    customerName: "Karthik Rao",
    customerPhone: "+91 9876543204",
    deliveryAddress: "Church Street, MG Road, Bangalore",
    customerLat: 12.9745,
    customerLng: 77.6060,
    restaurantId: "rest_5",
    restaurantName: "Empire Restaurant (Shivajinagar)",
    restaurantLat: 12.9738,
    restaurantLng: 77.6075,
    items: [
      { itemId: "m_501", name: "Empire Special Butter Chicken", price: 310, quantity: 1, isVeg: false },
      { itemId: "m_502", name: "Coin Parotta (3 Pcs) with Ghee Gravy", price: 140, quantity: 2, isVeg: true }
    ],
    itemTotal: 590,
    deliveryFee: 0,
    taxes: 29,
    grandTotal: 619,
    status: 'ACCEPTED',
    paymentMode: 'ONLINE',
    paymentApp: 'EasyWay FastPay Wallet',
    isPrepaid: true,
    txnRef: 'WAL-FD-36718901',
    otp: "3671",
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60000).toISOString()
  },
  {
    id: "order_106",
    customerId: "usr_deepak",
    customerName: "Deepak Nair",
    customerPhone: "+91 9876543205",
    deliveryAddress: "Lavelle Road, Bangalore",
    customerLat: 12.9690,
    customerLng: 77.5990,
    restaurantId: "rest_6",
    restaurantName: "Punjab Grill Royal Kitchen",
    restaurantLat: 12.9702,
    restaurantLng: 77.6015,
    items: [
      { itemId: "m_601", name: "Dal Makhani Bukhara Style", price: 280, quantity: 2, isVeg: true },
      { itemId: "m_602", name: "Paneer Tikka Angaare", price: 290, quantity: 1, isVeg: true },
      { itemId: "m_604", name: "Garlic Butter Naan", price: 70, quantity: 3, isVeg: true }
    ],
    itemTotal: 1060,
    deliveryFee: 0,
    taxes: 53,
    grandTotal: 1113,
    status: 'PREPARING',
    paymentMode: 'ONLINE',
    paymentApp: 'Google Pay (GPay)',
    isPrepaid: true,
    txnRef: 'UPI-FD8942987654',
    otp: "8942",
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: "order_107",
    customerId: "usr_sneha",
    customerName: "Sneha Patel",
    customerPhone: "+91 9876543206",
    deliveryAddress: "Trinity Circle, MG Road, Bangalore",
    customerLat: 12.9730,
    customerLng: 77.6180,
    restaurantId: "rest_7",
    restaurantName: "Mainland China & Wok Express",
    restaurantLat: 12.9740,
    restaurantLng: 77.6195,
    items: [
      { itemId: "m_701", name: "Schezwan Chilli Garlic Hakka Noodles", price: 240, quantity: 1, isVeg: true },
      { itemId: "m_703", name: "Steamed Chicken Dimsums (6 Pcs)", price: 260, quantity: 1, isVeg: false }
    ],
    itemTotal: 500,
    deliveryFee: 0,
    taxes: 25,
    grandTotal: 525,
    status: 'READY_FOR_PICKUP',
    paymentMode: 'ONLINE',
    paymentApp: 'ICICI NetBanking',
    isPrepaid: true,
    txnRef: 'TXN-FD-NET-62189012',
    otp: "6218",
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60000).toISOString()
  }
];

class FoodDeliveryService {
  private restaurants: Map<string, Restaurant> = new Map();
  private orders: Map<string, FoodOrder> = new Map();

  constructor() {
    INITIAL_RESTAURANTS.forEach(r => this.restaurants.set(r.id, r));
    INITIAL_KITCHEN_ORDERS.forEach(o => this.orders.set(o.id, o));
  }

  getAllRestaurants(search?: string, cuisine?: string): Restaurant[] {
    let list = Array.from(this.restaurants.values());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.cuisine.toLowerCase().includes(q) ||
        r.menu.some(m => m.name.toLowerCase().includes(q))
      );
    }
    if (cuisine) {
      const c = cuisine.toLowerCase();
      list = list.filter(r => r.cuisine.toLowerCase().includes(c));
    }
    return list;
  }

  getRestaurantById(id: string): Restaurant | undefined {
    return this.restaurants.get(id);
  }

  createOrder(data: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress: string;
    customerLat: number;
    customerLng: number;
    restaurantId: string;
    items: OrderItem[];
  }): FoodOrder {
    const restaurant = this.restaurants.get(data.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    const itemTotal = data.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const deliveryFee = itemTotal > 400 ? 0 : 35;
    const taxes = Math.round(itemTotal * 0.05);
    const grandTotal = itemTotal + deliveryFee + taxes;
    const orderOtp = String(Math.floor(1000 + Math.random() * 9000));

    const orderId = `order_${Date.now()}`;
    const order: FoodOrder = {
      id: orderId,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      deliveryAddress: data.deliveryAddress,
      customerLat: data.customerLat,
      customerLng: data.customerLng,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantLat: restaurant.lat,
      restaurantLng: restaurant.lng,
      items: data.items,
      itemTotal,
      deliveryFee,
      taxes,
      grandTotal,
      status: 'PLACED',
      paymentMode: 'ONLINE',
      paymentApp: 'Google Pay (GPay)',
      isPrepaid: true,
      txnRef: `UPI-FD${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      deliveryPartner: {
        id: "dp_ramesh",
        name: "Ramesh Kumar (Bike)",
        phone: "+91 9876543211",
        vehicleNumber: "AP-16-FD-5821",
        rating: 4.9,
        currentLat: restaurant.lat - 0.003,
        currentLng: restaurant.lng - 0.002
      },
      otp: orderOtp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.orders.set(orderId, order);
    return order;
  }

  getOrderById(id: string): FoodOrder | undefined {
    return this.orders.get(id);
  }

  getAllOrders(): FoodOrder[] {
    return Array.from(this.orders.values()).reverse();
  }

  updateOrderStatus(orderId: string, status: OrderStatus, photoProofUrl?: string): FoodOrder {
    const order = this.orders.get(orderId);
    if (!order) throw new Error("Order not found");
    order.status = status;
    if (photoProofUrl) {
      order.photoProofUrl = photoProofUrl;
    }
    order.updatedAt = new Date().toISOString();
    return order;
  }

  getStats() {
    const ordersList = Array.from(this.orders.values());
    const totalGmv = ordersList.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.grandTotal : 0), 0);
    const deliveredCount = ordersList.filter(o => o.status === 'DELIVERED').length;

    return {
      totalRestaurants: this.restaurants.size,
      totalOrders: ordersList.length,
      deliveredOrders: deliveredCount,
      grossMerchandiseValue: Math.round(totalGmv * 100) / 100,
      activeOnlinePartners: 3,
      avgDeliveryMins: 24
    };
  }
}

export const foodService = new FoodDeliveryService();
