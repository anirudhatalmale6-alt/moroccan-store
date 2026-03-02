// i18n translation system
// Supports: ar (Arabic, RTL), fr (French, LTR)

const translations = {
  ar: {
    // Direction
    _dir: 'rtl',
    _lang: 'ar',

    // Common
    home: 'الرئيسية',
    our_products: 'منتجاتنا',
    shop_now: 'تسوق الآن',
    order_now: 'اطلب الآن',
    cart: 'السلة',
    menu: 'القائمة',
    categories: 'التصنيفات',
    all_rights: 'جميع الحقوق محفوظة',
    close: 'إغلاق',
    loading_more: 'جاري تحميل المزيد...',
    no_products: 'لا توجد منتجات متاحة حالياً',
    currency: 'د.م',
    verified: 'موثّق',
    customer: 'عميل',

    // Availability
    in_stock: 'متوفر الآن — توصيل لجميع المدن',
    out_of_stock: 'غير متوفر حاليا',
    preorder: 'طلب مسبق — سيتم الشحن قريبا',

    // Product
    features: 'المميزات',
    gallery: 'معرض الصور',
    faq: 'أسئلة شائعة',
    description: 'الوصف',
    quantity: 'الكمية',
    total: 'المجموع',
    add_to_cart: 'أضف للسلة',
    buy_now: 'اشتري الآن',
    view_reviews: 'شاهد التقييمات',
    reviews_count: 'تقييم',
    delivery_fee: 'رسوم التوصيل',
    free_delivery: 'توصيل مجاني',
    weight: 'الوزن',
    variations_size: 'الحجم',
    variations_color: 'اللون',

    // Reviews / Feedback
    customer_reviews: 'تقييمات عملائنا',
    customer_feedback: 'آراء العملاء',
    what_customers_say: 'ماذا يقول عملاؤنا',
    view_all_reviews: 'عرض كل التقييمات',
    no_reviews_yet: 'لا توجد تقييمات بعد',
    be_first_reviewer: 'كن أول من يشارك تجربته!',
    share_experience: 'شاركنا تجربتك',
    your_name: 'الاسم الكامل',
    your_phone: 'رقم الهاتف',
    your_review: 'تعليقك (اختياري)',
    rating: 'التقييم',
    photos: 'صور (اختياري — حتى 3 صور)',
    voice_note: 'تعليق صوتي (اختياري)',
    submit_review: 'إرسال التقييم',
    sending_review: 'جاري الإرسال...',
    review_sent_success: 'شكراً! تم إرسال تعليقك بنجاح',
    on_product: 'على',
    record: 'تسجيل',
    stop: 'إيقاف',
    play: 'تشغيل',
    delete_recording: 'حذف',

    // Cart
    your_cart: 'سلتك',
    shopping_cart: 'سلة المشتريات',
    empty_cart: 'سلتك فارغة',
    continue_shopping: 'تسوق الآن',
    remove: 'حذف',
    subtotal: 'المجموع الفرعي',
    checkout: 'إتمام الطلب',
    gift_products: 'هدايا مجانية',
    free_gift: 'هدية مجانية',

    // Checkout
    order_info: 'معلومات الطلب',
    full_name: 'الاسم الكامل',
    phone: 'رقم الهاتف',
    address: 'العنوان',
    city: 'المدينة',
    notes: 'ملاحظات',
    payment_method: 'طريقة الدفع',
    bank_transfer_full: 'تحويل بنكي - الدفع الكامل',
    bank_transfer_deposit: 'تحويل بنكي - عربون',
    cod: 'الدفع عند الاستلام',
    place_order: 'تأكيد الطلب',
    upload_receipt: 'رفع إيصال التحويل',
    deposit_amount: 'مبلغ العربون',
    remaining: 'المبلغ المتبقي',
    order_summary: 'ملخص الطلب',
    contact_delivery_info: 'معلومات الاتصال والتوصيل',
    info: 'المعلومات',
    payment: 'الدفع',
    confirmation: 'التأكيد',
    full_payment: 'دفع كامل',
    deposit: 'عربون',
    delivery_note: 'التوصيل: 50 درهم',
    free_delivery_same_day: 'مجاني — نفس اليوم',
    amount_to_transfer: 'المبلغ المطلوب تحويله',
    copy_name: 'نسخ اسم صاحب الحساب',
    sending_order: 'جاري إرسال الطلب...',
    processing: 'جاري المعالجة...',
    checkout_description: '',

    // Thank you
    thank_you: 'شكراً لك!',
    order_confirmed: 'تم تأكيد طلبك بنجاح',
    order_ref: 'رقم الطلب',
    whatsapp_support: 'تواصل معنا عبر واتساب',

    // Footer pages
    return_policy: 'سياسة الإرجاع',
    payment_delivery: 'الدفع والتوصيل',
    contact_us: 'اتصل بنا',

    // Contact
    contact_title: 'تواصل معنا',
    send_message: 'إرسال',

    // Account
    my_account: 'حسابي',
    my_orders: 'طلباتي',
    settings: 'الإعدادات',
    logout: 'خروج',

    // Sidebar
    sidebar_feedback: 'آراء العملاء',

    // 404
    page_not_found: 'الصفحة غير موجودة',
    back_to_home: 'العودة للرئيسية',

    // Checkout - payment options
    choose_size: 'اختر الحجم',
    choose_color: 'اختر اللون',
    payment_delivery_option: 'خيار الدفع والتوصيل',
    cod_title: 'الدفع عند الاستلام (COD)',
    cod_desc: 'ادفع المبلغ الكامل عند استلام الطلب',
    no_receipt_needed: 'لا حاجة لإيصال',
    delivery_24_48: 'التوصيل خلال 24-48 ساعة',
    bank_full_title: 'الدفع الكامل (تحويل بنكي)',
    bank_full_desc: 'ادفع المبلغ الكامل واحصل على',
    same_day: 'في نفس اليوم',
    deposit_title: 'دفع العربون (تحويل بنكي)',
    pay: 'ادفع',
    as_deposit: 'كعربون',
    remaining_on_delivery: 'المتبقي عند الاستلام',
    delivery_within_48: 'التوصيل خلال 48 ساعة',
    bank_transfer: 'التحويل البنكي',
    bank_name: 'البنك',
    account_holder: 'صاحب الحساب',
    account_number_rib: 'رقم الحساب (RIB)',
    copy: 'نسخ',
    click_upload_receipt: 'اضغط لرفع صورة إيصال الدفع',
    receipt_preview: 'معاينة الإيصال',
    please_upload_receipt: 'يرجى رفع إيصال الدفع',
    original_product: 'المنتج الأصلي',
    payment_option: 'خيار الدفع',
    delivery: 'التوصيل',
    amount_required: 'المبلغ المطلوب',
    secure_transaction: 'معاملة آمنة ومشفرة',
    processing_order: 'جاري معالجة طلبك...',
    file_selected: 'تم اختيار الملف بنجاح',
    fill_required_fields: 'يرجى تعبئة جميع الحقول المطلوبة',
    enter_name: 'يرجى إدخال الاسم الكامل',
    enter_phone: 'يرجى إدخال رقم الهاتف',
    invalid_phone: 'رقم الهاتف غير صالح',
    enter_city: 'يرجى إدخال المدينة',
    enter_address: 'يرجى إدخال العنوان',
    choose_image_pdf: 'يرجى اختيار صورة أو ملف PDF',
    file_too_large: 'حجم الملف كبير جداً',
    error_occurred: 'حدث خطأ، يرجى المحاولة مرة أخرى',
    connection_error: 'حدث خطأ في الاتصال',
    free: 'مجاناً',

    // Cart extras
    products: 'منتجات',
    no_products_added: 'لم تضف أي منتجات بعد',
    back_to_cart: 'العودة إلى السلة',
    tap_details: 'اضغط لعرض التفاصيل',
    tap_hide: 'اضغط لإخفاء التفاصيل',

    // Product page
    why_our_product: 'لماذا منتجنا؟',
    features_best_choice: 'مميزات تجعله الخيار الأفضل',
    product_photos: 'صور المنتج',
    view_all_angles: 'شاهد المنتج من كل الزوايا',
    faq_title: 'الأسئلة المتكررة',
    write_review: 'اكتب تقييمك',
    back_to_reviews: 'العودة للتقييمات',
    we_love_hearing: 'نحب نسمعو منك!',
    review_moderation_note: 'سيتم مراجعة تعليقك قبل نشره',
    thanks_for_review: 'شكراً على تعليقك!',
    review_submitted: 'تم إرسال تعليقك بنجاح. سيتم مراجعته ونشره قريباً.',
    send_another_review: 'إرسال تعليق آخر',
    dont_miss_offer: 'لا تفوّت العرض المحدود!',
    cta_desc: 'احصل على منتجك اليوم بسعر مخفض مع توصيل سريع لجميع مدن المغرب',
    adding_to_cart: 'جاري الإضافة...',
    added_to_cart: 'تمت إضافة المنتج للسلة',
    max_3_photos: 'الحد الأقصى 3 صور',
    images_only: 'يرجى اختيار صور فقط',
    image_too_large: 'حجم الصورة كبير جداً (الحد الأقصى 10 ميجابايت)',
    photos_selected: 'صورة — اضغط لتغيير',
    sold_out: 'نفذت الكمية!',
    only_left_prefix: 'باقي',
    only_left_suffix: 'قطع فقط!',
  },

  fr: {
    // Direction
    _dir: 'ltr',
    _lang: 'fr',

    // Common
    home: 'Accueil',
    our_products: 'Nos Produits',
    shop_now: 'Acheter maintenant',
    order_now: 'Commander',
    cart: 'Panier',
    menu: 'Menu',
    categories: 'Catégories',
    all_rights: 'Tous droits réservés',
    close: 'Fermer',
    loading_more: 'Chargement en cours...',
    no_products: 'Aucun produit disponible pour le moment',
    currency: 'DH',
    verified: 'Vérifié',
    customer: 'Client',

    // Availability
    in_stock: 'Disponible — Livraison dans toutes les villes',
    out_of_stock: 'Rupture de stock',
    preorder: 'Précommande — Expédition prochainement',

    // Product
    features: 'Caractéristiques',
    gallery: 'Galerie Photos',
    faq: 'Questions fréquentes',
    description: 'Description',
    quantity: 'Quantité',
    total: 'Total',
    add_to_cart: 'Ajouter au panier',
    buy_now: 'Acheter maintenant',
    view_reviews: 'Voir les avis',
    reviews_count: 'avis',
    delivery_fee: 'Frais de livraison',
    free_delivery: 'Livraison gratuite',
    weight: 'Poids',
    variations_size: 'Taille',
    variations_color: 'Couleur',

    // Reviews / Feedback
    customer_reviews: 'Avis de nos clients',
    customer_feedback: 'Avis Clients',
    what_customers_say: 'Ce que disent nos clients',
    view_all_reviews: 'Voir tous les avis',
    no_reviews_yet: 'Aucun avis pour le moment',
    be_first_reviewer: 'Soyez le premier à partager votre expérience !',
    share_experience: 'Partagez votre expérience',
    your_name: 'Nom complet',
    your_phone: 'Numéro de téléphone',
    your_review: 'Votre avis (optionnel)',
    rating: 'Note',
    photos: 'Photos (optionnel — jusqu\'à 3)',
    voice_note: 'Note vocale (optionnel)',
    submit_review: 'Envoyer l\'avis',
    sending_review: 'Envoi en cours...',
    review_sent_success: 'Merci ! Votre avis a été envoyé avec succès',
    on_product: 'sur',
    record: 'Enregistrer',
    stop: 'Arrêter',
    play: 'Écouter',
    delete_recording: 'Supprimer',

    // Cart
    your_cart: 'Votre panier',
    shopping_cart: 'Panier d\'achat',
    empty_cart: 'Votre panier est vide',
    continue_shopping: 'Acheter maintenant',
    remove: 'Supprimer',
    subtotal: 'Sous-total',
    checkout: 'Commander',
    gift_products: 'Cadeaux gratuits',
    free_gift: 'Cadeau gratuit',

    // Checkout
    order_info: 'Informations de commande',
    full_name: 'Nom complet',
    phone: 'Numéro de téléphone',
    address: 'Adresse',
    city: 'Ville',
    notes: 'Remarques',
    payment_method: 'Mode de paiement',
    bank_transfer_full: 'Virement bancaire - Paiement intégral',
    bank_transfer_deposit: 'Virement bancaire - Acompte',
    cod: 'Paiement à la livraison',
    place_order: 'Confirmer la commande',
    upload_receipt: 'Télécharger le reçu',
    deposit_amount: 'Montant de l\'acompte',
    remaining: 'Montant restant',
    order_summary: 'Résumé de la commande',
    contact_delivery_info: 'Coordonnées et livraison',
    info: 'Informations',
    payment: 'Paiement',
    confirmation: 'Confirmation',
    full_payment: 'Paiement intégral',
    deposit: 'Acompte',
    delivery_note: 'Livraison: 50 DH',
    free_delivery_same_day: 'Gratuit — le jour même',
    amount_to_transfer: 'Montant à transférer',
    copy_name: 'Copier le nom du titulaire',
    sending_order: 'Envoi de la commande...',
    processing: 'Traitement en cours...',
    checkout_description: '',

    // Thank you
    thank_you: 'Merci !',
    order_confirmed: 'Votre commande a été confirmée avec succès',
    order_ref: 'Numéro de commande',
    whatsapp_support: 'Contactez-nous via WhatsApp',

    // Footer pages
    return_policy: 'Politique de retour',
    payment_delivery: 'Paiement et Livraison',
    contact_us: 'Contactez-nous',

    // Contact
    contact_title: 'Contactez-nous',
    send_message: 'Envoyer',

    // Account
    my_account: 'Mon compte',
    my_orders: 'Mes commandes',
    settings: 'Paramètres',
    logout: 'Déconnexion',

    // Sidebar
    sidebar_feedback: 'Avis Clients',

    // 404
    page_not_found: 'Page non trouvée',
    back_to_home: 'Retour \u00e0 l\'accueil',

    // Checkout - payment options
    choose_size: 'Choisir la taille',
    choose_color: 'Choisir la couleur',
    payment_delivery_option: 'Option de paiement et livraison',
    cod_title: 'Paiement \u00e0 la livraison (COD)',
    cod_desc: 'Payez le montant total \u00e0 la r\u00e9ception',
    no_receipt_needed: 'Pas de re\u00e7u n\u00e9cessaire',
    delivery_24_48: 'Livraison sous 24-48 heures',
    bank_full_title: 'Paiement int\u00e9gral (virement bancaire)',
    bank_full_desc: 'Payez le montant total et b\u00e9n\u00e9ficiez de',
    same_day: 'le jour m\u00eame',
    deposit_title: 'Acompte (virement bancaire)',
    pay: 'Payez',
    as_deposit: 'en acompte',
    remaining_on_delivery: 'Restant \u00e0 la livraison',
    delivery_within_48: 'Livraison sous 48 heures',
    bank_transfer: 'Virement bancaire',
    bank_name: 'Banque',
    account_holder: 'Titulaire du compte',
    account_number_rib: 'Num\u00e9ro de compte (RIB)',
    copy: 'Copier',
    click_upload_receipt: 'Cliquez pour t\u00e9l\u00e9charger le re\u00e7u',
    receipt_preview: 'Aper\u00e7u du re\u00e7u',
    please_upload_receipt: 'Veuillez t\u00e9l\u00e9charger le re\u00e7u de paiement',
    original_product: 'Produit original',
    payment_option: 'Option de paiement',
    delivery: 'Livraison',
    amount_required: 'Montant requis',
    secure_transaction: 'Transaction s\u00e9curis\u00e9e et crypt\u00e9e',
    processing_order: 'Traitement de votre commande...',
    file_selected: 'Fichier s\u00e9lectionn\u00e9 avec succ\u00e8s',
    fill_required_fields: 'Veuillez remplir tous les champs obligatoires',
    enter_name: 'Veuillez entrer votre nom complet',
    enter_phone: 'Veuillez entrer votre num\u00e9ro de t\u00e9l\u00e9phone',
    invalid_phone: 'Num\u00e9ro de t\u00e9l\u00e9phone invalide',
    enter_city: 'Veuillez entrer la ville',
    enter_address: 'Veuillez entrer l\'adresse',
    choose_image_pdf: 'Veuillez choisir une image ou un fichier PDF',
    file_too_large: 'Le fichier est trop volumineux',
    error_occurred: 'Une erreur est survenue, veuillez r\u00e9essayer',
    connection_error: 'Erreur de connexion',
    free: 'Gratuit',

    // Cart extras
    products: 'produits',
    no_products_added: 'Vous n\'avez ajout\u00e9 aucun produit',
    back_to_cart: 'Retour au panier',
    tap_details: 'Appuyez pour voir les d\u00e9tails',
    tap_hide: 'Appuyez pour masquer les d\u00e9tails',

    // Product page
    why_our_product: 'Pourquoi notre produit ?',
    features_best_choice: 'Des caract\u00e9ristiques qui en font le meilleur choix',
    product_photos: 'Photos du produit',
    view_all_angles: 'Voir le produit sous tous les angles',
    faq_title: 'Questions fr\u00e9quentes',
    write_review: '\u00c9crire un avis',
    back_to_reviews: 'Retour aux avis',
    we_love_hearing: 'Nous aimons vous entendre !',
    review_moderation_note: 'Votre avis sera examin\u00e9 avant publication',
    thanks_for_review: 'Merci pour votre avis !',
    review_submitted: 'Votre avis a \u00e9t\u00e9 envoy\u00e9 avec succ\u00e8s. Il sera publi\u00e9 apr\u00e8s examen.',
    send_another_review: 'Envoyer un autre avis',
    dont_miss_offer: 'Ne manquez pas cette offre limit\u00e9e !',
    cta_desc: 'Obtenez votre produit aujourd\'hui \u00e0 prix r\u00e9duit avec livraison rapide',
    adding_to_cart: 'Ajout en cours...',
    added_to_cart: 'Produit ajout\u00e9 au panier',
    max_3_photos: 'Maximum 3 photos',
    images_only: 'Veuillez s\u00e9lectionner uniquement des images',
    image_too_large: 'L\'image est trop volumineuse (max 10 Mo)',
    photos_selected: 'photo(s) — cliquez pour changer',
    sold_out: '\u00c9puis\u00e9 !',
    only_left_prefix: 'Plus que',
    only_left_suffix: 'pi\u00e8ces restantes !',
  }
};

/**
 * Get translation function for a given language
 * @param {string} lang - 'ar' or 'fr'
 * @returns {function} Translation function t(key, fallback)
 */
function getTranslator(lang) {
  const dict = translations[lang] || translations.ar;
  return function t(key, fallback) {
    return dict[key] !== undefined ? dict[key] : (fallback || key);
  };
}

/**
 * Get language direction
 * @param {string} lang - 'ar' or 'fr'
 * @returns {string} 'rtl' or 'ltr'
 */
function getDirection(lang) {
  return lang === 'fr' ? 'ltr' : 'rtl';
}

module.exports = { translations, getTranslator, getDirection };
