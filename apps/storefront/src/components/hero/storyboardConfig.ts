export type EmotionalMoodId = 'love' | 'longing' | 'new_beginning'

export interface EmotionalMood {
  id: EmotionalMoodId
  label: string
  sublabel: string
  accentColor: string
  glowColor: string
  bgGradient: string
  quote: string
}

export interface BoutiqueFlorist {
  id: string
  name: string
  neighborhood: string
  rating: number
  deliveryTime: string
  specialty: string
  accentFlower: string
}

export const STORYBOARD_MOODS: Record<EmotionalMoodId, EmotionalMood> = {
  love: {
    id: 'love',
    label: 'برای دوست‌داشتن',
    sublabel: 'شور، شیفتگی و پیوند عمیق',
    accentColor: '#e0536c',
    glowColor: 'rgba(224, 83, 108, 0.45)',
    bgGradient: 'radial-gradient(ellipse 90% 80% at 50% 40%, rgba(66, 22, 33, 0.7) 0%, rgba(20, 38, 29, 0.95) 70%, #0d1e16 100%)',
    quote: 'حرفی که در نگاهت هست را گل‌ها بی‌پروا می‌گویند.',
  },
  longing: {
    id: 'longing',
    label: 'برای دلتنگی',
    sublabel: 'یادآوری، وفاداری و آرامش دل',
    accentColor: '#7ba6d9',
    glowColor: 'rgba(123, 166, 217, 0.42)',
    bgGradient: 'radial-gradient(ellipse 90% 80% at 50% 40%, rgba(22, 45, 66, 0.68) 0%, rgba(18, 36, 30, 0.95) 70%, #0b1a13 100%)',
    quote: 'فاصله‌ها با یک شاخه گل، به اندازه یک لبخند کوتاه می‌شوند.',
  },
  new_beginning: {
    id: 'new_beginning',
    label: 'برای یک شروع تازه',
    sublabel: 'امید، شکفتن و آرزوهای نو',
    accentColor: '#e8a862',
    glowColor: 'rgba(232, 168, 98, 0.48)',
    bgGradient: 'radial-gradient(ellipse 90% 80% at 50% 40%, rgba(64, 46, 24, 0.65) 0%, rgba(22, 41, 31, 0.95) 70%, #0c1c14 100%)',
    quote: 'هر روز فرصتی است برای دوباره جوانه زدن و شکوفا شدن.',
  },
}

export const BOUTIQUE_FLORISTS: BoutiqueFlorist[] = [
  {
    id: 'florist-1',
    name: 'آتلیه گل فلورا',
    neighborhood: 'سعادت‌آباد (نزدیک شما)',
    rating: 4.9,
    deliveryTime: 'ارسال در کمتر از ۴۵ دقیقه',
    specialty: 'دسته‌گل‌های مینی‌مال با رز هلندی و اکالیپتوس',
    accentFlower: 'رز پیونی سفید و بلانژ',
  },
  {
    id: 'florist-2',
    name: 'بوتیک گل مریم',
    neighborhood: 'نیاوران (نزدیک شما)',
    rating: 4.95,
    deliveryTime: 'ارسال اختصاصی با باکس خنک',
    specialty: 'باکس‌های کریستالی با ارکیده فالانوپسیس',
    accentFlower: 'ارکیده و رانونکولوس هلویی',
  },
  {
    id: 'florist-3',
    name: 'استودیو طراحی نسترن',
    neighborhood: 'ونک (نزدیک شما)',
    rating: 4.88,
    deliveryTime: 'ارسال فوری در ۱ ساعت',
    specialty: 'ترکیب گل‌های فصلی و معطر با بسته‌بندی ابریشمی',
    accentFlower: 'نرگس شیراز و پیونی صورتی',
  },
]

export const STORYBOARD_STAGES = [
  {
    index: 0,
    title: 'سرآغاز',
    headline: 'بعضی حرف‌ها، با یک گل شروع می‌شوند.',
    subtext: 'یک غنچه شیشه‌ای؛ بازتاب نیت‌های پاک و کلماتی که هنوز بر زبان نیامده‌اند.',
  },
  {
    index: 1,
    title: 'انتخاب حس',
    headline: 'حسی که در سینه داری، چه رنگی است؟',
    subtext: 'برای هر نیت عاشقانه یا دلتنگی، ترکیبی از گل‌ها برای روایت احساس تو آماده‌اند.',
  },
  {
    index: 2,
    title: 'انتخاب‌های بسیار',
    headline: 'هر گلفروشی، یک انتخاب تازه.',
    subtext: 'تنوعی بی‌پایان از چیدمان‌های اصیل و هنرمندانه در ویترین گلفروشی‌های منتخب گلینو.',
  },
  {
    index: 3,
    title: 'نزدیکی',
    headline: 'و شاید گلِ منتظرت، همین نزدیکی باشد.',
    subtext: 'از نزدیک‌ترین بوتیک‌های محله، تازه چیده شده و در دمای مناسب تا دستان شما.',
  },
  {
    index: 4,
    title: 'ورود به فروشگاه',
    headline: 'حست را انتخاب کن. گلینو، انتخاب‌هایش را نشانت می‌دهد.',
    subtext: 'آماده‌ای تا هدیه مناسب این لحظه را کشف کنی؟',
  },
]
