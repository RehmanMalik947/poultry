require("dotenv").config();
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/db");
const {
  User, Customer, Staff, StaffLog, StaffAttachment, Role, Supplier,
  Service, Package, StaffService, ServiceItem, Category, Product, Sale,
  SaleItem, SaleReturn, SaleReturnItem, SaleReturnPayment, Payment, Bank,
  Appointment, ExpenseCategory, Expense, UserSalary, Attendance, Payroll,
  PayrollBonusDeduction, Purchase, PurchaseItem, PurchaseReturn,
  PurchaseReturnItem, PurchaseReturnPayment, Unit, Brand, Variation,
  ProductVariation, Stock, StockLog, StockAdjustment, StockTransfer,
  BankTransaction, SupplierTransaction, CashRegister, CashRegisterTransaction
} = require("../models");
const { Subscription } = require("../models/subscription");

const ORG_ID = 1;
const BRANCH_ID = 1;
const TARGET = 150;

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log("Connected & Synced\n");

    // =====================================================================
    // 1. SUBSCRIPTIONS (no org/branch FK)
    // =====================================================================
    const subData = [
      { name: "Monthly Basic", durationDays: 30, price: 29.99 },
      { name: "Monthly Premium", durationDays: 30, price: 79.99 },
      { name: "Quarterly Basic", durationDays: 90, price: 79.99 },
      { name: "Quarterly Premium", durationDays: 90, price: 199.99 },
      { name: "Yearly Basic", durationDays: 365, price: 299.99 },
      { name: "Yearly Premium", durationDays: 365, price: 799.99 },
      { name: "Starter Plan", durationDays: 15, price: 9.99 },
      { name: "Silver Monthly", durationDays: 30, price: 49.99 },
      { name: "Gold Monthly", durationDays: 30, price: 99.99 },
      { name: "Platinum Monthly", durationDays: 30, price: 149.99 },
      { name: "Diamond Monthly", durationDays: 30, price: 199.99 },
      { name: "Enterprise Monthly", durationDays: 30, price: 499.99 },
      { name: "Starter Plus", durationDays: 30, price: 59.99 },
      { name: "Business Basic", durationDays: 90, price: 149.99 },
      { name: "Business Pro", durationDays: 90, price: 299.99 },
      { name: "Enterprise Basic", durationDays: 365, price: 999.99 },
      { name: "Enterprise Pro", durationDays: 365, price: 1499.99 },
      { name: "Trial Plan", durationDays: 7, price: 0.00 },
    ];
    for (const s of subData.slice(0, TARGET)) {
      await Subscription.findOrCreate({ where: { name: s.name }, defaults: s });
    }
    console.log(`1. Subscriptions: ${await Subscription.count()}`);

    // =====================================================================
    // 2. ROLES (depends on org)
    // =====================================================================
    const roleNames = [
      "Admin", "Manager", "Cashier", "Receptionist", "Barber", "Senior Barber",
      "Hairdresser", "Senior Stylist", "Color Specialist", "Nail Technician",
      "Makeup Artist", "Spa Therapist", "Esthetician", "Massage Therapist",
      "Bridal Specialist", "Shampoo Boy", "Junior Stylist", "Apprentice",
      "Floor Manager", "Assistant Manager", "Bookkeeper", "Inventory Clerk",
      "Marketing", "IT Support", "HR Assistant", "Accountant", "Security",
      "Cleaner", "Trainer", "Team Lead", "Supervisor", "Department Head",
      "Operations Manager", "Quality Control", "Procurement", "Warehouse Staff",
      "Driver", "Photographer", "Social Media", "Front Desk",
      "Salon Manager", "Regional Manager", "Training Manager",
      "Menu: Super Admin", "Menu: Admin", "Menu: Manager", "Menu: Staff",
      "Supplier Admin", "Customer Admin", "Report Viewer",
      "Sales Manager", "Purchase Manager", "Store Keeper", "Production Manager",
      "Quality Assurance", "R&D Manager", "Customer Support", "Technical Lead",
      "Project Manager", "Business Analyst", "Data Entry", "Office Assistant",
      "Reception Lead", "Guest Relations", "Concierge", "Valet",
      "Driver Manager", "Fleet Manager", "Logistics Coordinator", "Warehouse Manager",
      "Inventory Controller", "Stock Auditor", "Pricing Analyst", "Category Manager",
      "Brand Manager", "Product Manager", "Ecommerce Manager", "Digital Marketer",
      "SEO Specialist", "Content Writer", "Graphic Designer", "Video Editor",
      "Event Coordinator", "Wedding Planner", "Party Organizer", "Kids Party Host",
      "Fitness Trainer", "Yoga Instructor", "Zumba Teacher", "Nutritionist",
      "Dietician", "Wellness Coach", "Meditation Guide", "Therapist",
      "Counselor", "Psychologist", "Life Coach", "Career Advisor",
      "Education Consultant", "Training Coordinator", "Learning Manager", "Instructional Designer",
      "Curriculum Developer", "Academic Advisor", "Professor", "Teacher",
      "Tutor", "Mentor", "Coach", "Facilitator",
      "Moderator", "Super Admin", "System Admin", "Database Admin",
      "Network Admin", "Security Admin", "Cloud Admin", "DevOps Engineer",
    ];
    for (const name of roleNames.slice(0, TARGET)) {
      await Role.findOrCreate({
        where: { organizationId: ORG_ID, name },
        defaults: { organizationId: ORG_ID, name, permissions: JSON.stringify(["dashboard_view", "pos_access"]) },
      });
    }
    console.log(`2. Roles: ${await Role.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 3. CUSTOMERS (depends on org, branch)
    // =====================================================================
    const custFirst = ["Ahmed","Sara","Ali","Fatima","Usman","Zainab","Bilal","Hira","Kamran","Mahnoor","Aamir","Babbar","Chand","Danish","Ehsan","Fawad","Ghulam","Haseeb","Irfan","Javed","Kashif","Liaqat","Mubashir","Nadeem","Obaid","Pervaiz","Qadir","Rashid","Sajid","Tahir","Umair","Waqar","Yasir","Zubair","Adnan","Cyrus","Daniyal","Ezaz","Farhan","Gohar","Hanif","Ismail","Junaid","Khalid","Luqman","Mansoor","Nasir","Owais","Parvez","Qasim","Rizwan","Shahid","Tariq","Umar","Waseem","Xavier","Younus","Zeeshan","Adeel","Babar","Faisal","Gulzar","Haris","Ijaz","Jamil","Khurram","Liaquat","Mazhar","Naveed","Omar","Pirzada","Qamar","Raza","Salman","Talha","Usman","Vaqar","Wahid","Yousuf","Zafar","Ayesha","Beena","Chandni","Dania","Eshal","Fariha","Gul","Hania","Iman","Javeria","Kiran","Laila","Maham","Nida","Omaima","Palwasha","Qandeel","Rida","Sana","Tania","Uzma","Varda","Wania","Yumna","Zara"];
    const custLast = ["Khan","Ahmed","Ali","Hassan","Hussain","Iqbal","Malik","Niazi","Raja","Sethi","Arain","Bajwa","Cheema","Dhindsa","Farooqi","Gill","Hashmi","Jutt","Khawaja","Langah","Abbasi","Butt","Chaudhry","Dar","Elahi","Fazal","Gondal","Jatoi","Kakar","Lashari","Magsi","Nawaz","Orakzai","Palijo","Qureshi","Rind","Sahito","Talpur","Umrani","Vighio","Wattoo","Yousafzai","Zardari","Tareen","Uddin","Virk","Waris","Yaqub","Zaman","Shaikh","Shah","Sultan","Mirza","Beg","Lone","Parveen","Akhtar","Bibi","Noor","Jahan","Sultana","Kausar","Firdous","Nasreen","Shamim","Rashid","Saleem","Latif","Hanif","Yousaf","Aslam","Nazir","Sabir","Kabir","Hasan","Husain","Rizvi","Naqvi","Jafri","Kazmi","Bokhari","Gilani","Qadri","Chishti","Naqshbandi","Suharwardi","Farooqi","Usmani","Siddiqui","Ansari","Quraishi","Hashmi","Qasmi","Razvi","Nuri","Sani","Asghar","Akbar","Mustafa","Murtaza","Haidar","Raza"];
    for (let i = 0; i < TARGET; i++) {
      const name = `${custFirst[i % custFirst.length]} ${custLast[i % custLast.length]}`;
      await Customer.findOrCreate({
        where: { organizationId: ORG_ID, name },
        defaults: {
          organizationId: ORG_ID, branchId: BRANCH_ID, name,
          email: `cust${i + 1}@email.com`,
          mobile: `0300${String(30000000 + i).slice(0, 8)}`,
          visits: Math.floor(Math.random() * 30),
          totalSpent: Math.floor(Math.random() * 80000),
          creditLimit: Math.floor(Math.random() * 50000),
          customerGroup: i % 3 === 0 ? "Wholesale" : "Retail",
        },
      });
    }
    console.log(`3. Customers: ${await Customer.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 4. SUPPLIERS (depends on org, branch)
    // =====================================================================
    const supplierNames = [
      "Beauty Products Distributors", "Salon Equipment Co.", "Hair Care Wholesale",
      "Nail Art Supplies", "Fragrance & Oils LLC", "Premium Cosmetics Ltd",
      "Professional Salon Supplies", "Organic Hair Solutions", "Luxury Beauty Imports",
      "Barber Shop Essentials", "Color House International", "Styling Tools Pro",
      "Skin Care Direct", "Makeup Artists Hub", "Spa Equipment Traders",
      "Hair Extension Factory", "Men's Grooming Supply", "Eco Beauty Products",
      "Chemical Solutions Inc", "Bridal Accessories Co", "Perfume & Scents Wholesale",
      "Shampoo Bulk Traders", "Nail Care International", "Waxing Supplies Co",
      "Hair Color Specialists", "Salon Furniture Mart", "Towels & Linens Supply",
      "Sanitization Products Co", "Uniforms & Apparel", "Gift Sets Packaging",
      "Aroma Oils Distributors", "Massage Equipment Co", "Spa Robes Supplier",
      "Towels & Linens Co", "Sterilization Equipment", "Disinfectant Supplies",
      "First Aid Kits Co", "Safety Equipment LLC", "Cleaning Supplies Co",
      "Office Furniture Mart", "Computer Systems Inc", "POS Systems Co",
      "Printer Supplies", "Stationery Wholesale", "Packaging Materials Co",
      "Gift Wrapping Supplies", "Ribbons & Bows Co", "Gift Boxes Factory",
      "Shopping Bags Co", "Labels & Stickers Inc", "Security Systems Co",
    ];
    for (let i = 0; i < Math.min(TARGET, supplierNames.length); i++) {
      const name = supplierNames[i % supplierNames.length];
      await Supplier.findOrCreate({
        where: { organizationId: ORG_ID, name },
        defaults: {
          organizationId: ORG_ID, branchId: BRANCH_ID, name,
          businessName: `${name} (Pvt) Ltd`,
          email: `supplier${i + 1}@example.com`,
          phone: `042-${String(7000000 + i).slice(0, 7)}`,
          taxNumber: `SUP-${String(3000 + i)}`,
          payTerm: 30 + (i % 3) * 15,
          payTermType: i % 2 === 0 ? "days" : "months",
        },
      });
    }
    console.log(`4. Suppliers: ${await Supplier.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 5. CATEGORIES (depends on org, branch)
    // =====================================================================
    const catData = [
      { name: "Hair Care", categoryType: "product" },
      { name: "Hair Styling", categoryType: "product" },
      { name: "Skin Care", categoryType: "product" },
      { name: "Nail Care", categoryType: "product" },
      { name: "Men's Grooming", categoryType: "product" },
      { name: "Haircut & Styling", categoryType: "service" },
      { name: "Hair Colouring", categoryType: "service" },
      { name: "Hair Treatments", categoryType: "service" },
      { name: "Facials & Skin", categoryType: "service" },
      { name: "Nails", categoryType: "service" },
      { name: "Bridal", categoryType: "service" },
      { name: "Makeup", categoryType: "service" },
      { name: "Massage", categoryType: "service" },
      { name: "Body Treatments", categoryType: "service" },
      { name: "Waxing", categoryType: "service" },
      { name: "Eye Makeup", categoryType: "product" },
      { name: "Lip Care", categoryType: "product" },
      { name: "Body Care", categoryType: "product" },
      { name: "Sun Care", categoryType: "product" },
      { name: "Organic", categoryType: "product" },
      { name: "Professional Tools", categoryType: "product" },
      { name: "Accessories", categoryType: "product" },
      { name: "Gift Sets", categoryType: "product" },
      { name: "Travel Kits", categoryType: "product" },
      { name: "Men's Fragrance", categoryType: "product" },
      { name: "Women's Fragrance", categoryType: "product" },
      { name: "Hair Accessories", categoryType: "product" },
      { name: "Beard Care", categoryType: "product" },
      { name: "Bath & Shower", categoryType: "product" },
      { name: "Electrical", categoryType: "product" },
      { name: "Bridal Services", categoryType: "service" },
      { name: "Packages", categoryType: "service" },
      { name: "Kids Services", categoryType: "service" },
      { name: "Barber Services", categoryType: "service" },
      { name: "Spa Packages", categoryType: "service" },
      { name: "Laser & Light", categoryType: "service" },
      { name: "Injectables", categoryType: "service" },
      { name: "Consultation", categoryType: "service" },
      { name: "Home Service", categoryType: "service" },
      { name: "Online Consultation", categoryType: "service" },
      { name: "Detox Programs", categoryType: "service" },
      { name: "Weight Management", categoryType: "service" },
      { name: "Nutrition", categoryType: "service" },
      { name: "Yoga & Fitness", categoryType: "service" },
      { name: "Meditation", categoryType: "service" },
      { name: "Alternative Therapy", categoryType: "service" },
      { name: "Wellness", categoryType: "service" },
      { name: "Membership", categoryType: "service" },
      { name: "Gift Voucher", categoryType: "service" },
      { name: "Teeth Whitening", categoryType: "service" },
      { name: "Eyelash Extensions", categoryType: "service" },
      { name: "Eyebrow Threading", categoryType: "service" },
      { name: "Henna Design", categoryType: "service" },
      { name: "Permanent Makeup", categoryType: "service" },
      { name: "Microblading", categoryType: "service" },
      { name: "Lip Blushing", categoryType: "service" },
      { name: "Scalp Micropigmentation", categoryType: "service" },
      { name: "PRP Therapy", categoryType: "service" },
      { name: "Hair Transplant", categoryType: "service" },
    ];
    for (const c of catData.slice(0, TARGET)) {
      await Category.findOrCreate({
        where: { organizationId: ORG_ID, name: c.name },
        defaults: { ...c, organizationId: ORG_ID, branchId: BRANCH_ID, description: c.name },
      });
    }
    console.log(`5. Categories: ${await Category.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 6. BRANDS (depends on org, branch)
    // =====================================================================
    const brandNames = [
      "L'Oreal Professionnel", "Wella Professionals", "Schwarzkopf", "Matrix", "Redken",
      "Nexxus", "Paul Mitchell", "Moroccanoil", "Olaplex", "OPI",
      "Tigi", "Aveda", "Joico", "Bumble and Bumble", "Kerastase",
      "Phyto", "Rene Furterer", "Alterna", "Living Proof", "Pureology",
      "Essie", "CND", "Sally Hansen", "China Glaze", "Orly",
      "Becca", "Fenty Skin", "The Ordinary", "Neutrogena", "CeraVe",
      "La Roche-Posay", "Vichy", "Bioderma", "Avene", "SkinCeuticals",
      "NARS", "Too Faced", "Urban Decay", "Benefit", "Huda Beauty",
      "Charlotte Tilbury", "Bobbi Brown", "Shu Uemura", "GHD", "Babyliss",
      "Dyson", "Remington", "Conair", "Wahl", "Andis",
      "Mizutani", "Hikari", "Kasho", "Jaguar", "Tondeo",
      "Feather", "Dorco", "Personna", "Treet", "Gillette",
      "Schick", "Bic", "Wilkinson Sword", "Merkur", "Edwin Jagger",
      "Muhle", "Parker", "Omega", "Semogue", "Kent",
      "Mason Pearson", "Denman", "Tangle Teezer", "Wet Brush", "Olivia Garden",
      "Y.S. Park", "Cricket", "Hercules Sage", "Fromm", "Kai",
      "Morris", "Dovo", "Boker", "Thiers Issard", "Wusthof",
    ];
    for (const name of brandNames.slice(0, TARGET)) {
      await Brand.findOrCreate({
        where: { organizationId: ORG_ID, name },
        defaults: { name, organizationId: ORG_ID, branchId: BRANCH_ID, description: name },
      });
    }
    console.log(`6. Brands: ${await Brand.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 7. UNITS (depends on org, branch)
    // =====================================================================
    const unitData = [
      { name: "Piece", shortName: "Pcs", allowDecimal: false },
      { name: "Bottle", shortName: "Btl", allowDecimal: false },
      { name: "Milliliter", shortName: "ml", allowDecimal: true },
      { name: "Liter", shortName: "L", allowDecimal: true },
      { name: "Gram", shortName: "g", allowDecimal: true },
      { name: "Kilogram", shortName: "kg", allowDecimal: true },
      { name: "Pack", shortName: "Pack", allowDecimal: false },
      { name: "Box", shortName: "Box", allowDecimal: false },
      { name: "Carton", shortName: "Ctn", allowDecimal: false },
      { name: "Dozen", shortName: "Dzn", allowDecimal: false },
      { name: "Pair", shortName: "Pr", allowDecimal: false },
      { name: "Set", shortName: "Set", allowDecimal: false },
      { name: "Tube", shortName: "Tub", allowDecimal: false },
      { name: "Jar", shortName: "Jar", allowDecimal: false },
      { name: "Can", shortName: "Can", allowDecimal: false },
      { name: "Spray", shortName: "Spray", allowDecimal: false },
      { name: "Roll", shortName: "Roll", allowDecimal: false },
      { name: "Sheet", shortName: "Sht", allowDecimal: false },
      { name: "Meter", shortName: "m", allowDecimal: true },
      { name: "Square Meter", shortName: "m2", allowDecimal: true },
      { name: "Cubic Meter", shortName: "m3", allowDecimal: true },
      { name: "Ounce", shortName: "oz", allowDecimal: true },
      { name: "Pound", shortName: "lb", allowDecimal: true },
      { name: "Gallon", shortName: "gal", allowDecimal: true },
      { name: "Quart", shortName: "qt", allowDecimal: true },
      { name: "Pint", shortName: "pt", allowDecimal: true },
      { name: "Fluid Ounce", shortName: "fl oz", allowDecimal: true },
      { name: "Tablet", shortName: "Tab", allowDecimal: false },
      { name: "Capsule", shortName: "Cap", allowDecimal: false },
      { name: "Sachet", shortName: "Sach", allowDecimal: false },
      { name: "Stick", shortName: "Stick", allowDecimal: false },
      { name: "Bar", shortName: "Bar", allowDecimal: false },
      { name: "Strip", shortName: "Strip", allowDecimal: false },
      { name: "Pad", shortName: "Pad", allowDecimal: false },
      { name: "Wipe", shortName: "Wipe", allowDecimal: false },
      { name: "Refill", shortName: "Ref", allowDecimal: false },
      { name: "Cup", shortName: "Cup", allowDecimal: false },
      { name: "Bowl", shortName: "Bowl", allowDecimal: false },
      { name: "Tray", shortName: "Tray", allowDecimal: false },
      { name: "Bag", shortName: "Bag", allowDecimal: false },
      { name: "Case", shortName: "Case", allowDecimal: false },
      { name: "Drum", shortName: "Drum", allowDecimal: false },
      { name: "Pail", shortName: "Pail", allowDecimal: false },
      { name: "Bucket", shortName: "Bucket", allowDecimal: false },
      { name: "Pod", shortName: "Pod", allowDecimal: false },
      { name: "Ampoule", shortName: "Amp", allowDecimal: false },
      { name: "Vial", shortName: "Vial", allowDecimal: false },
      { name: "Dropper", shortName: "Drop", allowDecimal: false },
      { name: "Pump", shortName: "Pump", allowDecimal: false },
      { name: "Applicator", shortName: "Appl", allowDecimal: false },
      { name: "Straw", shortName: "Straw", allowDecimal: false },
      { name: "Lid", shortName: "Lid", allowDecimal: false },
      { name: "Cap", shortName: "Cap", allowDecimal: false },
      { name: "Nozzle", shortName: "Noz", allowDecimal: false },
      { name: "Filter", shortName: "Flt", allowDecimal: false },
      { name: "Pad", shortName: "Pad", allowDecimal: false },
      { name: "Sponge", shortName: "Spg", allowDecimal: false },
      { name: "Brush", shortName: "Brs", allowDecimal: false },
      { name: "Comb", shortName: "Cmb", allowDecimal: false },
      { name: "Clip", shortName: "Clp", allowDecimal: false },
      { name: "Pin", shortName: "Pin", allowDecimal: false },
      { name: "Band", shortName: "Bnd", allowDecimal: false },
      { name: "Tie", shortName: "Tie", allowDecimal: false },
      { name: "Ribbon", shortName: "Rbn", allowDecimal: false },
      { name: "String", shortName: "Str", allowDecimal: false },
      { name: "Cord", shortName: "Crd", allowDecimal: false },
      { name: "Cable", shortName: "Cbl", allowDecimal: false },
      { name: "Wire", shortName: "Wre", allowDecimal: false },
    ];
    for (const u of unitData.slice(0, TARGET)) {
      await Unit.findOrCreate({
        where: { organizationId: ORG_ID, name: u.name },
        defaults: { ...u, organizationId: ORG_ID, branchId: BRANCH_ID },
      });
    }
    console.log(`7. Units: ${await Unit.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 8. VARIATIONS (depends on org, branch)
    // =====================================================================
    const varData = [
      { name: "Size", values: ["100ml", "200ml", "300ml", "500ml", "1L"] },
      { name: "Color", values: ["Red", "Blue", "Green", "Black", "Brown", "Gold", "Silver", "Pink", "Purple", "White"] },
      { name: "Type", values: ["Normal", "Dry", "Oily", "Sensitive", "Combination"] },
      { name: "Length", values: ["Short", "Medium", "Long", "XL"] },
      { name: "Width", values: ["Narrow", "Regular", "Wide"] },
      { name: "Height", values: ["Low", "Medium", "High"] },
      { name: "Material", values: ["Plastic", "Metal", "Wood", "Glass", "Ceramic"] },
      { name: "Flavor", values: ["Mint", "Strawberry", "Vanilla", "Chocolate", "Lemon"] },
      { name: "Scent", values: ["Rose", "Lavender", "Citrus", "Ocean", "Musk"] },
      { name: "Finish", values: ["Matte", "Glossy", "Satin", "Shimmer", "Natural"] },
      { name: "Formula", values: ["Cream", "Gel", "Liquid", "Powder", "Spray"] },
      { name: "Strength", values: ["Mild", "Regular", "Strong", "Extra Strong"] },
      { name: "Concentration", values: ["5%", "10%", "15%", "20%", "30%"] },
      { name: "Coverage", values: ["Light", "Medium", "Full"] },
      { name: "Texture", values: ["Smooth", "Creamy", "Gritty", "Silky"] },
      { name: "Shine", values: ["Low", "Medium", "High", "Ultra"] },
      { name: "Hold", values: ["Light", "Medium", "Strong", "Extra Strong"] },
      { name: "Absorption", values: ["Fast", "Medium", "Slow"] },
      { name: "Pigment", values: ["Low", "Medium", "High"] },
      { name: "Shade", values: ["Fair", "Light", "Medium", "Tan", "Dark"] },
      { name: "Tone", values: ["Warm", "Cool", "Neutral"] },
      { name: "Opacity", values: ["Sheer", "Semi", "Opaque"] },
      { name: "Stretch", values: ["Low", "Medium", "High"] },
      { name: "Fit", values: ["Tight", "Regular", "Loose"] },
      { name: "Pattern", values: ["Solid", "Striped", "Dotted", "Floral"] },
      { name: "Edition", values: ["Regular", "Limited", "Special", "Collector"] },
      { name: "Grade", values: ["Economy", "Standard", "Premium", "Luxury"] },
      { name: "Quality", values: ["Basic", "Good", "Better", "Best"] },
      { name: "Level", values: ["Entry", "Intermediate", "Advanced", "Expert"] },
      { name: "Intensity", values: ["Low", "Medium", "High", "Very High"] },
      { name: "Speed", values: ["Slow", "Medium", "Fast"] },
      { name: "Temperature", values: ["Cold", "Warm", "Hot"] },
      { name: "Weight", values: ["Light", "Medium", "Heavy"] },
      { name: "Volume", values: ["Small", "Medium", "Large", "XL"] },
      { name: "Duration", values: ["15min", "30min", "45min", "60min", "90min"] },
      { name: "Frequency", values: ["Daily", "Weekly", "Monthly"] },
      { name: "Application", values: ["Direct", "With Brush", "Spray", "Drop"] },
      { name: "Age Group", values: ["Kids", "Teens", "Adults", "Seniors"] },
      { name: "Gender", values: ["Male", "Female", "Unisex"] },
      { name: "Season", values: ["Spring", "Summer", "Fall", "Winter"] },
      { name: "Occasion", values: ["Casual", "Formal", "Party", "Bridal"] },
      { name: "Skin Type", values: ["Normal", "Dry", "Oily", "Combination", "Sensitive"] },
      { name: "Hair Type", values: ["Straight", "Wavy", "Curly", "Coily"] },
      { name: "Base", values: ["Water", "Oil", "Silicone", "Alcohol"] },
      { name: "Format", values: ["Liquid", "Solid", "Powder", "Cream", "Gel"] },
      { name: "Series", values: ["Classic", "Pro", "Elite", "Essential"] },
      { name: "Size Family", values: ["Travel", "Standard", "Jumbo", "Professional"] },
      { name: "Package Type", values: ["Box", "Bag", "Bottle", "Jar", "Tube"] },
      { name: "Dispenser", values: ["Pump", "Spray", "Dropper", "Cap"] },
      { name: "Refill Type", values: ["Refillable", "Disposable", "Recyclable"] },
      { name: "Sweetness", values: ["Low", "Medium", "High", "Very High"] },
      { name: "Spiciness", values: ["Mild", "Medium", "Hot", "Very Hot"] },
      { name: "Acidity", values: ["Low", "Medium", "High"] },
      { name: "Bitterness", values: ["None", "Low", "Medium", "High"] },
      { name: "Saltiness", values: ["Low", "Medium", "High"] },
      { name: "Umami", values: ["Low", "Medium", "High"] },
      { name: "Fragrance", values: ["Light", "Medium", "Strong", "Intense"] },
      { name: "Longevity", values: ["Short", "Medium", "Long", "Very Long"] },
      { name: "Projection", values: ["Low", "Medium", "High", "Beast"] },
    ];
    for (const v of varData.slice(0, TARGET)) {
      await Variation.findOrCreate({
        where: { organizationId: ORG_ID, name: v.name },
        defaults: { organizationId: ORG_ID, branchId: BRANCH_ID, name: v.name, values: JSON.stringify(v.values) },
      });
    }
    console.log(`8. Variations: ${await Variation.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 9. EXPENSE CATEGORIES (depends on org, branch)
    // =====================================================================
    const expCatNames = [
      "Rent", "Utilities", "Salaries & Wages", "Inventory Purchase",
      "Marketing & Advertising", "Maintenance & Repairs", "Licenses & Permits",
      "Insurance", "Cleaning & Supplies", "Miscellaneous",
      "Office Supplies", "Transportation", "Training", "Staff Welfare",
      "Uniforms", "Decoration", "Events", "Consultant Fees",
      "Legal Fees", "Accounting Fees", "Bank Charges", "Credit Card Fees",
      "Interest", "Taxes", "Software Subscriptions", "IT Services",
      "Website", "Hosting", "Domain", "Phone",
      "Postage", "Printing", "Stationery", "Furniture",
      "Equipment Lease", "Security", "Janitorial", "Parking",
      "Travel", "Accommodation", "Meals", "Entertainment",
      "Gifts", "Donations", "Staff Party", "Team Building",
      "Recruitment", "Medical", "COVID Supplies", "Depreciation",
      "Commission", "Bonus", "Overtime", "Contractor Fees",
      "Freelance", "Professional Services", "Audit Fees", "Tax Preparation",
      "Annual Returns", "Business Registration", "Renewal Fees", "Membership Dues",
      "Subscriptions", "Cloud Services", "Data Backup", "Cybersecurity",
      "Domain Renewal", "SSL Certificate", "Email Hosting", "CRM Software",
      "ERP Software", "Accounting Software", "POS System", "Payment Gateway",
      "Merchant Fees", "Processing Fees", "Refunds", "Chargebacks",
      "Bad Debts", "Write-offs", "Inventory Loss", "Spoilage",
      "Expired Products", "Damaged Goods", "Theft", "Breakage",
      "Spillage", "Contamination", "Recalls", "Returns",
      "Freight", "Shipping", "Courier", "Delivery",
      "Customs", "Duties", "Tariffs", "Import Fees",
    ];
    for (const name of expCatNames.slice(0, TARGET)) {
      await ExpenseCategory.findOrCreate({
        where: { organizationId: ORG_ID, name },
        defaults: { organizationId: ORG_ID, branchId: BRANCH_ID, name, description: name },
      });
    }
    console.log(`9. Expense Categories: ${await ExpenseCategory.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 10. STAFF (depends on org, branch)
    // =====================================================================
    const staffFirstNames = [
      "Ali", "Sara", "Usman", "Fatima", "Ahmed", "Zainab", "Bilal", "Hira",
      "Kamran", "Mahnoor", "Arif", "Barkat", "Chotu", "Dilshad", "Ejaz",
      "Firdous", "Ghafoor", "Hameed", "Ilyas", "Jamshaid", "Kaleem", "Latif",
      "Mustafa", "Nazir", "Parveen", "Rashida", "Sakeena", "Tabassum", "Uzma",
      "Waheeda", "Yasmeen", "Zubaida", "Anjum", "Bushra", "Celina", "Fakhra",
      "Gulshan", "Hina", "Ismat", "Jahan", "Kausar", "Lubna", "Mehwish",
      "Naheed", "Qaisara", "Rubina", "Shabnam", "Tahira", "Shaista", "Nabila",
      "Abdul", "Basit", "Danish", "Farhan", "Ghulam", "Haris", "Irfan", "Javed",
      "Kashif", "Liaqat", "Mazhar", "Naeem", "Owais", "Parvez", "Qasim", "Rizwan",
      "Shahid", "Tariq", "Umar", "Waqas", "Xain", "Yasir", "Zahid", "Aamir",
      "Babur", "Chand", "Dawar", "Ehsan", "Fawad", "Gohar", "Hamid", "Ijaz",
      "Jamil", "Khalid", "Luqman", "Mansoor", "Nadeem", "Omar", "Pir", "Qayyum",
      "Rashid", "Sajid", "Talha", "Usama", "Viqar", "Wahid", "Yousuf", "Zafar",
    ];
    const staffRoles = [
      "Barber", "Hairdresser", "Receptionist", "Nail Technician", "Shampoo Boy",
      "Junior Stylist", "Senior Stylist", "Color Specialist", "Makeup Artist",
      "Therapist", "Massage Therapist", "Esthetician", "Bridal Artist",
      "Manager", "Assistant Manager", "Floor Manager", "Front Desk",
      "Cleaner", "Trainer", "Apprentice", "Hair Colorist", "Perm Specialist",
      "Extension Specialist", "Wig Specialist", "Texture Expert", "Curly Hair Specialist",
      "African Hair Specialist", "Asian Hair Specialist", "European Hair Specialist",
      "Men's Barber", "Kids Barber", "Beard Specialist", "Mustache Specialist",
      "Eyebrow Specialist", "Lash Specialist", "Permanent Makeup Artist", "Microblading Artist",
      "Body Piercer", "Tattoo Artist", "Scar Camouflage Artist", "Medical Aesthetician",
      "Laser Technician", "IPL Technician", "RF Technician", "Ultrasound Technician",
      "Injectables Nurse", "PRP Specialist", "Microneedling Specialist", "Chemical Peel Specialist",
      "Sales Associate", "Cashier", "Stock Clerk", "Inventory Manager",
      "Purchase Manager", "Store Manager", "Area Manager", "Regional Manager",
      "Country Manager", "CEO", "CTO", "CFO", "COO", "CIO", "CMO",
    ];
    for (let i = 0; i < TARGET; i++) {
      const fn = staffFirstNames[i % staffFirstNames.length];
      const email = `staff${i + 1}@salon.com`;
      await Staff.findOrCreate({
        where: { organizationId: ORG_ID, email },
        defaults: {
          organizationId: ORG_ID, branchId: BRANCH_ID,
          firstName: fn, lastName: "Staff",
          email, role: staffRoles[i % staffRoles.length],
          commissionType: "percentage", commissionValue: 5 + (i % 10),
          isActive: true, allowLogin: false,
          mobileNumber: `0300${String(40000000 + i).slice(0, 8)}`,
          workingDays: JSON.stringify(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]),
          startTime: "09:00", endTime: "18:00",
        },
      });
    }
    console.log(`10. Staff: ${await Staff.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 11. USERS (depends on org, branch)
    // =====================================================================
    const hashedPw = await bcrypt.hash("User@123", 10);
    const userRoles = ["ADMIN", "MANAGER", "STAFF", "CASHIER", "RECEPTIONIST", "BARBER", "SUPERVISOR", "ACCOUNTANT"];
    for (let i = 0; i < TARGET; i++) {
      const username = `user${i + 1}`;
      await User.findOrCreate({
        where: { organizationId: ORG_ID, username },
        defaults: {
          organizationId: ORG_ID, branchId: BRANCH_ID,
          name: `User ${i + 1}`, username,
          email: `user${i + 1}@salon.com`, password: hashedPw,
          role: userRoles[i % userRoles.length],
        },
      });
    }
    console.log(`11. Users: ${await User.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 12. PRODUCTS (depends on brands, units, categories)
    // =====================================================================
    const allBrands = await Brand.findAll({ where: { organizationId: ORG_ID } });
    const allUnits = await Unit.findAll({ where: { organizationId: ORG_ID } });
    const allCats = await Category.findAll({ where: { organizationId: ORG_ID, categoryType: "product" } });
    const prodNames = [
      "L'Oreal Serie Expert Shampoo", "Wella SP Conditioner", "Moroccanoil Treatment",
      "Olaplex No.3 Hair Perfector", "Schwarzkopf Got2b Glued Gel",
      "Matrix Biolage Hairspray", "OPI Nail Lacquer", "Redken All Soft Shampoo",
      "Paul Mitchell Tea Tree Shampoo", "Nexxus Keraphix Hair Mask",
      "Argan Oil Shampoo", "Coconut Conditioner", "Tea Tree Hair Gel",
      "Biotin Hair Serum", "Keratin Hair Mask", "Anti-Frizz Serum",
      "Heat Protectant Spray", "Dry Shampoo Powder", "Sea Salt Spray",
      "Volumizing Mousse", "Root Lifter Spray", "Split End Treatment",
      "Scalp Scrub", "Hair Perfume", "Beard Oil Premium",
      "Beard Balm", "Face Wash Men's", "After Shave Lotion",
      "Pre-Shave Oil", "Shaving Cream", "Hand Cream",
      "Body Lotion", "Cuticle Oil", "Nail Strengthener",
      "Base Coat", "Top Coat", "Matte Top Coat",
      "Nail Polish Remover", "Makeup Remover", "Toner",
      "Moisturizer", "Sunscreen SPF50", "Lip Balm",
      "Eye Cream", "Serum Vitamin C", "Face Mask Sheet",
      "Exfoliating Scrub", "Clay Mask", "Night Cream", "Eye Shadow Palette",
      "Foundation", "Concealer", "Powder", "Blush", "Bronzer",
      "Highlighter", "Setting Spray", "Primer", "Lipstick", "Lip Gloss",
      "Lip Liner", "Eyeliner", "Mascara", "Brow Pencil", "Brow Gel",
      "Eyeshadow Single", "Eyeshadow Palette", "Makeup Brush Set", "Sponge Blender",
      "Hair Dryer", "Flat Iron", "Curling Iron", "Hair Clippers",
      "Trimmer", "Shaver", "Razor", "Blades", "Scissors",
      "Shears", "Thinning Scissors", "Clipper Guards", "Combs", "Brushes",
      "Rollers", "Clips", "Pins", "Caps", "Towels",
      "Gowns", "Capes", "Aprons", "Gloves", "Masks",
    ];
    const priceData = [
      { purchase: 650, sell: 950 }, { purchase: 700, sell: 1050 }, { purchase: 2500, sell: 3800 },
      { purchase: 3200, sell: 4500 }, { purchase: 350, sell: 550 }, { purchase: 800, sell: 1200 },
      { purchase: 900, sell: 1400 }, { purchase: 1200, sell: 1800 }, { purchase: 1500, sell: 2200 },
      { purchase: 1800, sell: 2700 }, { purchase: 400, sell: 650 }, { purchase: 500, sell: 800 },
      { purchase: 300, sell: 500 }, { purchase: 1100, sell: 1700 }, { purchase: 1600, sell: 2400 },
      { purchase: 850, sell: 1300 }, { purchase: 600, sell: 950 }, { purchase: 450, sell: 700 },
      { purchase: 550, sell: 850 }, { purchase: 700, sell: 1100 }, { purchase: 750, sell: 1200 },
      { purchase: 950, sell: 1500 }, { purchase: 500, sell: 800 }, { purchase: 1300, sell: 2000 },
      { purchase: 400, sell: 650 }, { purchase: 350, sell: 550 }, { purchase: 250, sell: 450 },
      { purchase: 300, sell: 500 }, { purchase: 280, sell: 480 }, { purchase: 200, sell: 350 },
      { purchase: 180, sell: 320 }, { purchase: 450, sell: 750 }, { purchase: 220, sell: 400 },
      { purchase: 350, sell: 600 }, { purchase: 300, sell: 500 }, { purchase: 300, sell: 500 },
      { purchase: 250, sell: 450 }, { purchase: 200, sell: 350 }, { purchase: 380, sell: 650 },
      { purchase: 420, sell: 700 }, { purchase: 550, sell: 900 }, { purchase: 600, sell: 1000 },
      { purchase: 280, sell: 480 }, { purchase: 750, sell: 1200 }, { purchase: 1000, sell: 1600 },
      { purchase: 400, sell: 700 }, { purchase: 350, sell: 600 }, { purchase: 500, sell: 850 },
      { purchase: 650, sell: 1100 }, { purchase: 900, sell: 1500 },
      { purchase: 1100, sell: 1800 }, { purchase: 300, sell: 500 }, { purchase: 250, sell: 450 },
      { purchase: 350, sell: 600 }, { purchase: 400, sell: 700 }, { purchase: 450, sell: 750 },
      { purchase: 550, sell: 900 }, { purchase: 200, sell: 350 }, { purchase: 180, sell: 320 },
      { purchase: 500, sell: 850 }, { purchase: 600, sell: 1000 }, { purchase: 800, sell: 1300 },
      { purchase: 1500, sell: 2500 }, { purchase: 2000, sell: 3200 }, { purchase: 1200, sell: 2000 },
      { purchase: 700, sell: 1200 }, { purchase: 300, sell: 500 }, { purchase: 250, sell: 450 },
      { purchase: 400, sell: 700 }, { purchase: 350, sell: 600 }, { purchase: 280, sell: 480 },
      { purchase: 320, sell: 550 }, { purchase: 450, sell: 750 }, { purchase: 150, sell: 300 },
      { purchase: 200, sell: 380 }, { purchase: 180, sell: 350 }, { purchase: 250, sell: 450 },
      { purchase: 300, sell: 550 }, { purchase: 350, sell: 600 }, { purchase: 400, sell: 700 },
      { purchase: 500, sell: 850 }, { purchase: 600, sell: 1000 }, { purchase: 700, sell: 1200 },
    ];
    for (let i = 0; i < TARGET; i++) {
      const sku = `PROD-ALL-${String(i + 1).padStart(4, "0")}`;
      const prices = priceData[i % priceData.length];
      const purchaseExc = prices.purchase + (i >= priceData.length ? Math.floor(i / priceData.length) * 50 : 0);
      const sellExc = prices.sell + (i >= priceData.length ? Math.floor(i / priceData.length) * 80 : 0);
      await Product.findOrCreate({
        where: { organizationId: ORG_ID, sku },
        defaults: {
          organizationId: ORG_ID, branchId: BRANCH_ID,
          name: prodNames[i % prodNames.length] + (i >= prodNames.length ? ` ${Math.floor(i / prodNames.length) + 1}` : ""),
          sku,
          brandId: allBrands[i % allBrands.length]?.id || null,
          unitId: allUnits[i % allUnits.length]?.id || null,
          categoryId: allCats[i % allCats.length]?.id || null,
          purchasePriceExc: purchaseExc,
          purchasePriceInc: Math.round(purchaseExc * 1.16 * 100) / 100,
          sellingPriceExc: sellExc,
          sellingPriceInc: Math.round(sellExc * 1.16 * 100) / 100,
          margin: Math.round(((sellExc - purchaseExc) / purchaseExc) * 10000) / 100,
          sellingPriceTaxType: "exclusive",
          productType: "single",
          applicableTax: "none",
          manageStock: true,
          alertQuantity: 10,
        },
      });
    }
    console.log(`12. Products: ${await Product.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 13. SERVICES (depends on categories)
    // =====================================================================
    const allServiceCats = await Category.findAll({ where: { organizationId: ORG_ID, categoryType: "service" } });
    const svcNames = [
      "Classic Haircut", "Premium Haircut & Blow-Dry", "Root Touch-Up",
      "Full Head Highlights", "Balayage", "Keratin Smoothing Treatment",
      "Deep Conditioning Treatment", "Olaplex Bonding Treatment",
      "Classic Facial", "Gold Facial", "Classic Manicure", "Classic Pedicure",
      "Gel Nails Full Set", "Bridal Makeup", "Bridal Hairstyling",
      "Express Haircut", "Kids Haircut", "Beard Trim", "Head Shave",
      "Color Gloss", "Hair Botox Express", "Scalp Treatment Deluxe",
      "Oxygen Therapy", "Hydra Facial Express", "Anti-Acne Facial",
      "Brightening Facial", "Charcoal Facial", "Luxury Manicure",
      "Spa Manicure", "French Manicure", "Luxury Pedicure", "Spa Pedicure",
      "Gel Polish Change", "Nail Art Basic", "Nail Art Premium",
      "Acrylic Full Set", "Shellac Manicure", "Paraffin Wax Hands",
      "Eyebrow Shape", "Upper Lip Wax", "Full Face Wax",
      "Back Wax", "Chest Wax", "Body Massage 30min",
      "Body Massage 60min", "Head Massage 30min", "Foot Massage 30min",
      "Hot Oil Therapy", "Scalp Treatment", "Keratin Blowout",
      "Cezanne Smoothing", "Brazilian Blowout", "Digital Perm",
      "Body Wave Perm", "Root Perm", "Hair Extensions Install",
      "Tape-In Extensions", "Beaded Row Extensions", "Sew-In Weave",
      "Wig Customization", "Wig Installation", "Lace Front Wig",
      "Hair Coloring Single Process", "Double Process Color", "Ombre",
      "Sombre", "Color Correction", "Bleach and Tone",
      "Toners Only", "Gloss Only", "Toning Treatment",
      "Eyelash Extensions Classic", "Volume Lashes", "Mega Volume Lashes",
      "Hybrid Lashes", "Lash Lift", "Lash Tint", "Brow Lamination",
      "Brow Tint", "Brow Wax", "Brow Threading", "Lip Wax",
      "Nose Wax", "Ear Wax", "Underarm Wax", "Leg Wax",
      "Arm Wax", "Bikini Wax", "Brazilian Wax", "Full Body Wax",
      "Microdermabrasion", "Hydrafacial", "Chemical Peel Light",
      "Chemical Peel Medium", "Chemical Peel Deep", "Dermaplane",
      "LED Light Therapy", "Radiofrequency Skin Tightening", "Ultrasound Facial",
      "Cryotherapy Facial", "Oxygen Facial", "Vitamin C Facial",
      "Collagen Facial", "Retinol Facial", "Hyaluronic Acid Facial",
      "PRP Facial", "Microneedling Facial", "Jet Peel Facial",
    ];
    for (let i = 0; i < TARGET; i++) {
      const code = `SVC-ALL-${String(i + 1).padStart(4, "0")}`;
      await Service.findOrCreate({
        where: { organizationId: ORG_ID, serviceCode: code },
        defaults: {
          organizationId: ORG_ID, branchId: BRANCH_ID,
          serviceName: svcNames[i % svcNames.length],
          serviceCode: code,
          categoryId: allServiceCats[i % allServiceCats.length]?.id || null,
          price: 300 + (i * 50),
          duration: 15 + (i * 2),
          status: "active",
          date: new Date().toISOString().split("T")[0],
          description: svcNames[i % svcNames.length],
        },
      });
    }
    console.log(`13. Services: ${await Service.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // 14. BANKS (depends on org, branch)
    // =====================================================================
    const bankNames = [
      "Habib Bank Limited", "MCB Bank", "Allied Bank", "United Bank Limited",
      "Bank Alfalah", "National Bank", "JS Bank", "Soneri Bank",
      "Silk Bank", "Sindh Bank", "Faysal Bank", "Bank of Punjab",
      "Meezan Bank", "Dubai Islamic Bank", "Al Baraka Bank",
      "Bank Islami", "Askari Bank", "Habib Metropolitan", "Standard Chartered",
      "Citi Bank", "Bank Al Habib", "FINCA", "Telenor Bank",
      "JazzCash", "Easypaisa", "Keystone Bank", "Summit Bank",
      "Samba Bank", "MCB Islamic", "HBL Islamic", "Burj Bank",
      "Deutsche Bank", "BNP Paribas", "Bank of China", "Barclays",
      "HSBC", "RBS", "ABN AMRO", "Credit Suisse",
      "UBS", "Santander", "BBVA", "ING Group",
      "MUFG", "Mizuho", "SMBC", "DBS Bank",
      "Bank of Khyber", "Punjab Bank", "Silk Bank Corporate",
      "First Women Bank", "Industrial Bank", "SME Bank", "Agricultural Bank",
      "Cooperative Bank", "Microfinance Bank", "Khushhali Bank", "Telenor Microfinance",
      "Apna Microfinance", "Mobilink Bank", "NRSP Bank", "FINCA Microfinance",
      "Kashf Foundation", "Asasah", "EasyPaisa Bank", "JazzCash Bank",
      "SadaPay", "NayaPay", "Keenu", "Fintech Bank",
      "Digital Bank", "Neobank", "Challenger Bank", "Virtual Bank",
    ];
    const accountTypes = ["Current", "Savings", "Current", "Savings", "Current", "Business", "Corporate", "Premium", "Platinum", "Diamond", "Gold", "Silver", "Bronze"];
    for (let i = 0; i < TARGET; i++) {
      const name = bankNames[i % bankNames.length];
      await Bank.findOrCreate({
        where: { organizationId: ORG_ID, bankName: name },
        defaults: {
          organizationId: ORG_ID, branchId: BRANCH_ID,
          bankName: name,
          accountHolder: `Account ${i + 1}`,
          accountType: accountTypes[i % accountTypes.length],
          accountNumber: `${name.substring(0, 3).toUpperCase()}-${String(1000000 + i).slice(0, 7)}`,
          balance: Math.floor(Math.random() * 500000),
          status: "Active",
        },
      });
    }
    console.log(`14. Banks: ${await Bank.count({ where: { organizationId: ORG_ID } })}`);

    // =====================================================================
    // FETCH REFERENCE DATA FOR CHILD TABLES
    // =====================================================================
    const allStaff = await Staff.findAll({ where: { organizationId: ORG_ID } });
    const allUsers = await User.findAll({ where: { organizationId: ORG_ID } });
    const allCustomers = await Customer.findAll({ where: { organizationId: ORG_ID } });
    const allSuppliers = await Supplier.findAll({ where: { organizationId: ORG_ID } });
    const allProducts = await Product.findAll({ where: { organizationId: ORG_ID } });
    const allServices = await Service.findAll({ where: { organizationId: ORG_ID } });
    const allBanks = await Bank.findAll({ where: { organizationId: ORG_ID } });
    const allExpenseCats = await ExpenseCategory.findAll({ where: { organizationId: ORG_ID } });
    const allVariations = await Variation.findAll({ where: { organizationId: ORG_ID } });
    const allBrandsFull = await Brand.findAll({ where: { organizationId: ORG_ID } });

    // =====================================================================
    // 15. PRODUCT VARIATIONS (depends on products, variations)
    // =====================================================================
    let pvCount = 0;
    for (let i = 0; i < TARGET; i++) {
      const prod = allProducts[i % allProducts.length];
      const varItem = allVariations[i % allVariations.length];
      if (prod && varItem) {
        try {
          await ProductVariation.findOrCreate({
            where: { productId: prod.id, name: varItem.name },
            defaults: {
              productId: prod.id, name: varItem.name,
              sku: `VAR-${prod.id}-${i}`,
              sellingPriceExc: Math.floor(Math.random() * 2000) + 100,
              currentStock: Math.floor(Math.random() * 50),
            },
          });
          pvCount++;
        } catch (e) { /* ignore */ }
      }
    }
    console.log(`15. Product Variations: ${pvCount}`);

    // =====================================================================
    // 16. SERVICE ITEMS (depends on services, products)
    // =====================================================================
    let siCount = 0;
    for (let i = 0; i < TARGET; i++) {
      const svc = allServices[i % allServices.length];
      const prod = allProducts[i % allProducts.length];
      if (svc && prod) {
        try {
          await ServiceItem.findOrCreate({
            where: { serviceId: svc.id, productId: prod.id },
            defaults: { serviceId: svc.id, productId: prod.id, quantity: 0.5 + Math.random() },
          });
          siCount++;
        } catch (e) { /* ignore */ }
      }
    }
    console.log(`16. Service Items: ${siCount}`);

    // =====================================================================
    // 17. STAFF SERVICES (depends on staff, services)
    // =====================================================================
    let ssCount = 0;
    for (let i = 0; i < TARGET; i++) {
      const stf = allStaff[i % allStaff.length];
      const svc = allServices[i % allServices.length];
      if (stf && svc) {
        try {
          await StaffService.findOrCreate({
            where: { staffId: stf.id, serviceId: svc.id },
            defaults: { staffId: stf.id, serviceId: svc.id, commissionType: "percentage", commissionValue: 10 },
          });
          ssCount++;
        } catch (e) { /* ignore */ }
      }
    }
    console.log(`17. Staff-Services: ${ssCount}`);

    // =====================================================================
    // 18. STAFF ATTACHMENTS (depends on staff)
    // =====================================================================
    let saCount = 0;
    for (let i = 0; i < Math.min(TARGET, allStaff.length); i++) {
      const stf = allStaff[i];
      try {
        await StaffAttachment.findOrCreate({
          where: { organizationId: ORG_ID, staffId: stf.id, fileName: `document_${i + 1}.pdf` },
          defaults: {
            organizationId: ORG_ID, staffId: stf.id,
            fileName: `document_${i + 1}.pdf`,
            storedFileName: `doc_${Date.now()}_${i}.pdf`,
            mimeType: "application/pdf",
            sizeBytes: Math.floor(Math.random() * 500000) + 10000,
            note: "Staff document",
            uploadedByStaffId: allStaff[i % allStaff.length]?.id || null,
          },
        });
        saCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`18. Staff Attachments: ${saCount}`);

    // =====================================================================
    // 19. USER SALARIES (depends on staff)
    // =====================================================================
    let usCount = 0;
    const salaryTypes = ["monthly", "weekly", "daily"];
    for (const stf of allStaff) {
      for (const month of [1, 4, 7, 10]) {
        if (usCount >= TARGET) break;
        const effDate = `2026-${String(month).padStart(2, "0")}-01`;
        try {
          await UserSalary.findOrCreate({
            where: { staffId: stf.id, effectiveFrom: effDate },
            defaults: {
              organizationId: ORG_ID, branchId: BRANCH_ID,
              staffId: stf.id,
              salaryType: salaryTypes[usCount % salaryTypes.length],
              amount: 15000 + (usCount * 500),
              effectiveFrom: effDate,
              status: "active",
            },
          });
          usCount++;
        } catch (e) { /* ignore */ }
      }
      if (usCount >= TARGET) break;
    }
    console.log(`19. User Salaries: ${usCount}`);

    // =====================================================================
    // 20. ATTENDANCES (depends on staff)
    // =====================================================================
    const months2026 = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    const attDays = ["01","02","03","04","05","07","08","09","10","11","12","14","15","16","17","18","19","21","22","23","24","25","26","28","29","30","31"];
    const attStatuses = ["present","present","present","present","present","present","present","present","late","absent","half-day","holiday","weekend"];
    let attCount = 0;
    for (const stf of allStaff.slice(0, 30)) {
      for (const m of months2026.slice(0, 3)) {
        for (const d of attDays.slice(0, 5)) {
          if (attCount >= TARGET) break;
          const date = `2026-${m}-${d}`;
          const status = attStatuses[Math.floor(Math.random() * attStatuses.length)];
          try {
            await Attendance.findOrCreate({
              where: { staffId: stf.id, date },
              defaults: { organizationId: ORG_ID, branchId: BRANCH_ID, staffId: stf.id, date, status },
            });
            attCount++;
          } catch (e) { /* ignore */ }
        }
        if (attCount >= TARGET) break;
      }
      if (attCount >= TARGET) break;
    }
    console.log(`20. Attendances: ${attCount}`);

    // =====================================================================
    // 21. PAYROLLS (depends on staff)
    // =====================================================================
    let payCount = 0;
    for (const stf of allStaff) {
      for (const month of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
        if (payCount >= TARGET) break;
        const baseSalary = 20000 + Math.floor(Math.random() * 30000);
        const bonus = Math.random() > 0.6 ? Math.floor(Math.random() * 5000) : 0;
        const deduction = Math.random() > 0.7 ? Math.floor(Math.random() * 3000) : 0;
        try {
          const [rec, created] = await Payroll.findOrCreate({
            where: { staffId: stf.id, month, year: 2026 },
            defaults: {
              organizationId: ORG_ID, branchId: BRANCH_ID,
              staffId: stf.id, month, year: 2026,
              baseSalary, bonus, deduction,
              netSalary: baseSalary + bonus - deduction,
              status: "paid",
              paidAt: `2026-${String(month + 1).padStart(2, "0")}-05`,
            },
          });
          if (created) {
            payCount++;
            if (bonus > 0) {
              await PayrollBonusDeduction.create({
                organizationId: ORG_ID, branchId: BRANCH_ID,
                payrollId: rec.id, type: "bonus", amount: bonus,
                reason: "Performance bonus",
                date: `2026-${String(month + 1).padStart(2, "0")}-01`,
              });
            }
            if (deduction > 0) {
              await PayrollBonusDeduction.create({
                organizationId: ORG_ID, branchId: BRANCH_ID,
                payrollId: rec.id, type: "deduction", amount: deduction,
                reason: "Deduction",
                date: `2026-${String(month + 1).padStart(2, "0")}-01`,
              });
            }
          }
        } catch (e) { /* ignore */ }
      }
      if (payCount >= TARGET) break;
    }
    console.log(`21. Payrolls: ${payCount}`);

    // =====================================================================
    // 22. PURCHASES (depends on suppliers)
    // =====================================================================
    let purchCount = 0;
    for (let i = 0; i < TARGET; i++) {
      const supplier = allSuppliers[i % allSuppliers.length];
      const totalAmount = Math.floor(Math.random() * 80000) + 5000;
      try {
        await Purchase.findOrCreate({
          where: { organizationId: ORG_ID, referenceNo: `PO-ALL-${String(i + 1).padStart(4, "0")}` },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            supplierId: supplier.id,
            referenceNo: `PO-ALL-${String(i + 1).padStart(4, "0")}`,
            purchaseDate: new Date(),
            status: i % 5 === 0 ? "ordered" : "received",
            totalAmount,
            paidAmount: Math.random() > 0.3 ? totalAmount : totalAmount * 0.5,
            paymentStatus: Math.random() > 0.3 ? "paid" : "partial",
          },
        });
        purchCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`22. Purchases: ${purchCount}`);

    // =====================================================================
    // 23. PURCHASE ITEMS (depends on purchases, products)
    // =====================================================================
    const allPurchases = await Purchase.findAll({ where: { organizationId: ORG_ID } });
    let piCount = 0;
    for (const purch of allPurchases) {
      const numItems = 1 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numItems; j++) {
        if (piCount >= TARGET) break;
        const prod = allProducts[(piCount + j) % allProducts.length];
        const qty = 1 + Math.floor(Math.random() * 10);
        const cost = Math.floor(Math.random() * 1000) + 50;
        try {
          await PurchaseItem.findOrCreate({
            where: { purchaseId: purch.id, productId: prod.id },
            defaults: {
              purchaseId: purch.id, productId: prod.id,
              name: prod.name, quantity: qty,
              unitCost: cost, sellingPrice: cost * 1.3,
              lineTotal: qty * cost,
            },
          });
          piCount++;
        } catch (e) { /* ignore */ }
      }
      if (piCount >= TARGET) break;
    }
    console.log(`23. Purchase Items: ${piCount}`);

    // =====================================================================
    // 24. SALES (depends on customers, users, staff)
    // =====================================================================
    const saleStatuses = ["paid", "paid", "paid", "unpaid", "partial"];
    const paymentMethods = ["Cash", "Card", "Cheque", "Multiple", "Bank Transfer", "Mobile Wallet", "Crypto", "Voucher"];
    let saleCount = 0;
    for (let i = 0; i < TARGET; i++) {
      const customer = allCustomers[i % allCustomers.length];
      const user = allUsers[i % allUsers.length];
      const stf = allStaff[i % allStaff.length];
      const total = Math.floor(Math.random() * 15000) + 500;
      const status = saleStatuses[i % saleStatuses.length];
      try {
        const [sale] = await Sale.findOrCreate({
          where: { organizationId: ORG_ID, invoiceNumber: `INV-ALL-${String(i + 1).padStart(4, "0")}` },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            userId: user?.id || null,
            customerId: customer?.id || null,
            staffId: stf?.id || null,
            subtotal: total,
            total,
            amountPaid: status === "paid" ? total : status === "partial" ? total * 0.5 : 0,
            status,
            paymentMethod: paymentMethods[i % paymentMethods.length],
            paymentStatus: status === "paid" ? "paid" : status === "unpaid" ? "due" : "paid",
            totalItems: 1 + Math.floor(Math.random() * 3),
            invoiceNumber: `INV-ALL-${String(i + 1).padStart(4, "0")}`,
          },
        });
        saleCount++;

        const svc = allServices[i % allServices.length];
        if (svc) {
          try {
            await SaleItem.findOrCreate({
              where: { saleId: sale.id, itemId: svc.id, itemType: "service" },
              defaults: {
                saleId: sale.id, itemId: svc.id,
                itemType: "service", itemName: svc.serviceName,
                price: svc.price, quantity: 1,
              },
            });
          } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
    }
    console.log(`24. Sales + Items: ${saleCount}`);

    // =====================================================================
    // 25. PAYMENTS (depends on sales, banks)
    // =====================================================================
    const allSales = await Sale.findAll({ where: { organizationId: ORG_ID } });
    let paymCount = 0;
    for (const sale of allSales) {
      if (paymCount >= TARGET) break;
      const bank = allBanks[paymCount % allBanks.length];
      try {
        await Payment.findOrCreate({
          where: { saleId: sale.id, amount: sale.total },
          defaults: {
            saleId: sale.id, amount: sale.total,
            paymentMethod: "Cash",
            bankId: bank?.id || null,
            note: "Payment for sale",
          },
        });
        paymCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`25. Payments: ${paymCount}`);

    // =====================================================================
    // 26. SALE RETURNS + ITEMS + PAYMENTS
    // =====================================================================
    let srCount = 0;
    for (const sale of allSales) {
      if (srCount >= TARGET) break;
      const total = Math.floor(Math.random() * 5000) + 500;
      try {
        const ret = await SaleReturn.findOrCreate({
          where: { organizationId: ORG_ID, invoiceNumber: `SR-ALL-${String(srCount + 1).padStart(4, "0")}` },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            saleId: sale.id, customerId: sale.customerId,
            returnDate: new Date(), subtotal: total,
            total, amountReturned: total,
            status: "paid",
            invoiceNumber: `SR-ALL-${String(srCount + 1).padStart(4, "0")}`,
          },
        });
        srCount++;
        const saleItem = await SaleItem.findOne({ where: { saleId: sale.id } });
        if (saleItem) {
          await SaleReturnItem.findOrCreate({
            where: { saleReturnId: ret.id, saleItemId: saleItem.id },
            defaults: {
              saleReturnId: ret.id, saleItemId: saleItem.id,
              itemId: saleItem.itemId, itemType: saleItem.itemType,
              itemName: saleItem.itemName, price: saleItem.price,
              quantityReturned: 1,
            },
          });
        }
        const bank = allBanks[srCount % allBanks.length];
        await SaleReturnPayment.findOrCreate({
          where: { saleReturnId: ret.id, amount: total },
          defaults: {
            saleReturnId: ret.id, amount: total,
            paymentMethod: "Cash", bankId: bank?.id || null,
            note: "Return payment",
          },
        });
      } catch (e) { /* ignore */ }
    }
    console.log(`26. Sale Returns + Items + Payments: ${srCount}`);

    // =====================================================================
    // 27. PURCHASE RETURNS + ITEMS + PAYMENTS
    // =====================================================================
    let prrCount = 0;
    for (const purch of allPurchases) {
      if (prrCount >= TARGET) break;
      const total = Math.floor(Math.random() * 10000) + 500;
      try {
        const ret = await PurchaseReturn.findOrCreate({
          where: { organizationId: ORG_ID, invoiceNumber: `PR-ALL-${String(prrCount + 1).padStart(4, "0")}` },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            purchaseId: purch.id, supplierId: purch.supplierId,
            returnDate: new Date(), subtotal: total, total,
            amountReturned: total, status: "paid",
            invoiceNumber: `PR-ALL-${String(prrCount + 1).padStart(4, "0")}`,
          },
        });
        prrCount++;
        const pi = await PurchaseItem.findOne({ where: { purchaseId: purch.id } });
        if (pi) {
          await PurchaseReturnItem.findOrCreate({
            where: { purchaseReturnId: ret.id, purchaseItemId: pi.id },
            defaults: {
              purchaseReturnId: ret.id, purchaseItemId: pi.id,
              quantityReturned: Math.floor(Math.random() * 5) + 1,
              amount: total / 2,
            },
          });
        }
        const bank = allBanks[prrCount % allBanks.length];
        await PurchaseReturnPayment.findOrCreate({
          where: { purchaseReturnId: ret.id, amount: total },
          defaults: {
            purchaseReturnId: ret.id, amount: total,
            paymentMethod: "Bank Transfer",
            bankId: bank?.id || null,
            transactionId: `TXN-PRP-${prrCount}`,
            note: "Refund for return",
          },
        });
      } catch (e) { /* ignore */ }
    }
    console.log(`27. Purchase Returns + Items + Payments: ${prrCount}`);

    // =====================================================================
    // 28. STOCKS (depends on products) - create for ALL products
    // =====================================================================
    const stockQtys = [25, 15, 8, 6, 20, 18, 30, 12, 10, 7, 40, 22, 14, 9, 5, 35, 28, 16, 11, 4, 50, 32, 19, 13, 3, 45, 38, 24, 17, 2, 60, 42, 26, 21, 1, 55, 48, 34, 27, 6, 33, 23, 29, 36, 41, 47, 53, 59, 65, 70, 11, 44, 31, 37, 43, 49, 54, 58, 62, 66, 15, 39, 46, 51, 56, 61, 63, 67, 68, 69, 18, 52, 57, 64, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96];
    let stkCount = 0;
    for (const prod of allProducts) {
      try {
        await Stock.findOrCreate({
          where: { organizationId: ORG_ID, branchId: BRANCH_ID, productId: prod.id },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            productId: prod.id,
            qty: stockQtys[stkCount % stockQtys.length],
            alertQty: 5 + (stkCount % 15),
          },
        });
        stkCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`28. Stocks: ${stkCount}`);

    // =====================================================================
    // 29. STOCK LOGS (depends on products, users) - create for ALL products
    // =====================================================================
    let slCount = 0;
    const movements = ["OPENING_STOCK", "PURCHASE", "SALE", "ADJUSTMENT_ADD", "ADJUSTMENT_SUB", "SALE_RETURN", "PURCHASE_RETURN", "TRANSFER_IN", "TRANSFER_OUT", "Added", "Deducted"];
    for (const prod of allProducts) {
      const qtyChange = 5 + (slCount % 50);
      const prevQty = 10 + (slCount % 100);
      try {
        await StockLog.findOrCreate({
          where: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            productId: prod.id, movementType: movements[slCount % movements.length],
            qtyChange,
          },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            productId: prod.id,
            userId: allUsers[slCount % allUsers.length]?.id || null,
            movementType: movements[slCount % movements.length],
            qtyChange, previousQty: prevQty,
            newQty: prevQty + qtyChange,
          },
        });
        slCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`29. Stock Logs: ${slCount}`);

    // =====================================================================
    // 30. STOCK ADJUSTMENTS (depends on users)
    // =====================================================================
    const adjReasons = ["Damaged", "Expired", "Missing", "Broken", "Theft", "Spoilage", "Counting Error", "Return to Supplier", "Quality Issue", "Sample", "Promotion", "Donation", "Write-off", "Transfer Loss", "Overstock Adjustment", "Seasonal Clearance", "Manufacturing Defect", "Packaging Damage", "Leakage", "Recall", "Obsolescence", "Temperature Damage", "Water Damage", "Fire Damage", "Mold", "Pest Damage", "Contamination", "Short Shelf Life", "Overproduction", "Underproduction", "Quality Control Fail", "Customer Return", "Inventory Audit", "System Error Correction", "Physical Count Variance", "Supplier Credit", "Warehouse Damage", "Shipping Damage", "Lost in Transit", "Misplacement", "Theft by Employee", "Security Breach", "Natural Disaster", "Flood Damage", "Earthquake Damage", "Power Outage Damage"];
    let adjCount = 0;
    for (let i = 0; i < TARGET; i++) {
      try {
        await StockAdjustment.findOrCreate({
          where: { organizationId: ORG_ID, referenceNo: `ADJ-ALL-${String(i + 1).padStart(4, "0")}` },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            referenceNo: `ADJ-ALL-${String(i + 1).padStart(4, "0")}`,
            adjustmentType: i % 5 === 0 ? "Abnormal" : "Normal",
            reason: adjReasons[i % adjReasons.length],
            totalAmount: Math.floor(Math.random() * 20000) + 500,
            userId: allUsers[i % allUsers.length]?.id || null,
          },
        });
        adjCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`30. Stock Adjustments: ${adjCount}`);

    // =====================================================================
    // 31. STOCK TRANSFERS (no org FK needed for branches in transfer)
    // =====================================================================
    let trfCount = 0;
    for (let i = 0; i < TARGET; i++) {
      try {
        await StockTransfer.findOrCreate({
          where: { organizationId: ORG_ID, referenceNo: `TRF-ALL-${String(i + 1).padStart(4, "0")}` },
          defaults: {
            organizationId: ORG_ID,
            fromBranchId: BRANCH_ID,
            toBranchId: BRANCH_ID,
            referenceNo: `TRF-ALL-${String(i + 1).padStart(4, "0")}`,
            status: i % 4 === 0 ? "Pending" : "Completed",
            notes: `Stock transfer ${i + 1}`,
            userId: allUsers[i % allUsers.length]?.id || null,
          },
        });
        trfCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`31. Stock Transfers: ${trfCount}`);

    // =====================================================================
    // 32. BANK TRANSACTIONS (depends on banks)
    // =====================================================================
    const txDesc = ["Deposit", "Withdrawal", "Transfer", "Payment received", "Fee charge", "Interest", "Refund", "Commission", "Salary", "Rent", "Utilities", "Tax Payment", "Loan Payment", "Investment", "Dividend", "Purchase", "Sale", "Reimbursement", "Bonus", "Penalty", "Fine", "Settlement", "Adjustment", "Correction", "Reversal"];
    let btCount = 0;
    for (const bank of allBanks) {
      for (let i = 0; i < 3; i++) {
        if (btCount >= TARGET) break;
        const type = i % 2 === 0 ? "credit" : "debit";
        const amount = Math.floor(Math.random() * 50000) + 1000;
        try {
          await BankTransaction.findOrCreate({
            where: { bankId: bank.id, amount, transactionType: txDesc[i], type },
            defaults: {
              organizationId: ORG_ID,
              bankId: bank.id, type, amount,
              transactionType: txDesc[i],
              description: `${txDesc[i]} to bank account`,
              transactionDate: new Date().toISOString().split("T")[0],
            },
          });
          btCount++;
        } catch (e) { /* ignore */ }
      }
      if (btCount >= TARGET) break;
    }
    console.log(`32. Bank Transactions: ${btCount}`);

    // =====================================================================
    // 33. SUPPLIER TRANSACTIONS (depends on suppliers, purchases)
    // =====================================================================
    let stCount = 0;
    for (const supplier of allSuppliers) {
      if (stCount >= TARGET) break;
      const amount = Math.floor(Math.random() * 40000) + 5000;
      const type = stCount % 2 === 0 ? "purchase" : "purchase_payment";
      try {
        await SupplierTransaction.findOrCreate({
          where: { supplierId: supplier.id, debit: type === "purchase" ? amount : 0, credit: type === "purchase_payment" ? amount : 0 },
          defaults: {
            organizationId: ORG_ID,
            supplierId: supplier.id, type,
            debit: type === "purchase" ? amount : 0,
            credit: type === "purchase_payment" ? amount : 0,
            balance: amount,
            note: type === "purchase" ? "New purchase" : "Payment made",
            date: new Date().toISOString().split("T")[0],
            purchaseId: allPurchases[stCount % allPurchases.length]?.id || null,
            bankId: allBanks[stCount % allBanks.length]?.id || null,
          },
        });
        stCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`33. Supplier Transactions: ${stCount}`);

    // =====================================================================
    // 34. APPOINTMENTS (depends on customers, services, staff)
    // =====================================================================
    const apptStatuses = ["booked", "completed", "completed", "completed", "cancelled", "no-show", "rescheduled", "pending"];
    const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];
    const apptDates = ["2026-05-01","2026-05-02","2026-05-03","2026-05-05","2026-05-06","2026-05-07","2026-05-08","2026-05-09","2026-05-10","2026-05-12","2026-05-13","2026-05-14","2026-05-15","2026-05-16","2026-05-17","2026-05-19","2026-05-20","2026-05-22","2026-05-23","2026-05-24","2026-05-26","2026-05-27","2026-05-28","2026-05-29","2026-05-30","2026-06-01","2026-06-02","2026-06-03","2026-05-25","2026-06-05","2026-06-06","2026-06-07","2026-06-08","2026-06-09","2026-06-10","2026-06-12","2026-06-13","2026-06-14","2026-06-15","2026-06-16","2026-06-17","2026-06-19","2026-06-20","2026-06-22","2026-06-23","2026-06-24","2026-06-25","2026-06-26","2026-06-27","2026-06-28","2026-06-29","2026-06-30","2026-07-01","2026-07-02","2026-07-03"];
    let apptCount = 0;
    for (const date of apptDates) {
      const numAppts = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numAppts; i++) {
        if (apptCount >= TARGET) break;
        const customer = allCustomers[Math.floor(Math.random() * allCustomers.length)];
        const service = allServices[Math.floor(Math.random() * allServices.length)];
        const stf = allStaff[Math.floor(Math.random() * allStaff.length)];
        const timeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];
        const status = apptStatuses[Math.floor(Math.random() * apptStatuses.length)];
        try {
          await Appointment.findOrCreate({
            where: { customerId: customer.id, date, timeSlot, serviceId: service.id },
            defaults: {
              organizationId: ORG_ID, branchId: BRANCH_ID,
              customerId: customer.id, serviceId: service.id,
              staffId: stf.id, date, timeSlot, status,
              notes: status === "cancelled" ? "Customer cancelled" : status === "no-show" ? "Did not show up" : "",
              bookingTime: new Date(),
              serviceDuration: service.duration || 30,
            },
          });
          apptCount++;
        } catch (e) { /* ignore */ }
      }
      if (apptCount >= TARGET) break;
    }
    console.log(`34. Appointments: ${apptCount}`);

    // =====================================================================
    // 35. EXPENSES (depends on expense_categories, banks, staff)
    // =====================================================================
    let expCount = 0;
    for (let i = 0; i < TARGET; i++) {
      const cat = allExpenseCats[i % allExpenseCats.length];
      const bank = allBanks[i % allBanks.length];
      const stf = allStaff[i % allStaff.length];
      const amt = Math.floor(Math.random() * 30000) + 500;
      try {
        await Expense.findOrCreate({
          where: { organizationId: ORG_ID, referenceNo: `EXP-ALL-${String(i + 1).padStart(4, "0")}` },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            categoryId: cat.id,
            referenceNo: `EXP-ALL-${String(i + 1).padStart(4, "0")}`,
            amount: amt, date: new Date().toISOString().split("T")[0],
            expenseFor: `Expense ${i + 1}`,
            description: `Auto-generated expense`,
            paymentMethod: i % 3 === 0 ? "cash" : i % 3 === 1 ? "cheque" : "bank_transfer",
            usedById: stf?.id || null,
            paymentAccountId: bank?.id || null,
          },
        });
        expCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`35. Expenses: ${expCount}`);

    // =====================================================================
    // 36. CASH REGISTERS (depends on users)
    // =====================================================================
    let crCount = 0;
    for (const user of allUsers) {
      if (crCount >= TARGET) break;
      try {
        const [rec] = await CashRegister.findOrCreate({
          where: { organizationId: ORG_ID, branchId: BRANCH_ID, userId: user.id, status: "closed" },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            userId: user.id, status: "closed",
            openingBalance: 5000,
            closingBalance: 5000 + Math.floor(Math.random() * 50000),
            expectedBalance: 5000 + Math.floor(Math.random() * 50000),
            openedAt: new Date(Date.now() - 86400000),
            closedAt: new Date(),
          },
        });
        crCount++;
        if (rec) {
          await CashRegisterTransaction.findOrCreate({
            where: { registerId: rec.id, type: "cash_in", amount: 5000 },
            defaults: { registerId: rec.id, type: "cash_in", amount: 5000, reason: "Opening balance" },
          });
        }
      } catch (e) { /* ignore */ }
    }
    console.log(`36. Cash Registers + Transactions: ${crCount}`);

    // =====================================================================
    // 37. STAFF LOGS (depends on staff, sales)
    // =====================================================================
    let staffLogCount = 0;
    for (const stf of allStaff) {
      if (staffLogCount >= TARGET) break;
      const sale = allSales[staffLogCount % allSales.length];
      const price = Math.floor(Math.random() * 5000) + 500;
      try {
        await StaffLog.findOrCreate({
          where: { staffId: stf.id, actionType: "Commission", itemName: `Service-${staffLogCount}` },
          defaults: {
            organizationId: ORG_ID, branchId: BRANCH_ID,
            staffId: stf.id, saleId: sale?.id || null,
            actionType: "Commission",
            itemName: `Service-${staffLogCount}`,
            price, commissionRate: "10%",
            amountEarned: price * 0.1,
          },
        });
        staffLogCount++;
      } catch (e) { /* ignore */ }
    }
    console.log(`37. Staff Logs: ${staffLogCount}`);

    // =====================================================================
    // 38. EXTRA TABLES (Raw SQL - supplier_purchases, wastages, inventory)
    // =====================================================================
    try {
      let spCount = 0;
      for (let i = 0; i < TARGET; i++) {
        const supplier = allSuppliers[i % allSuppliers.length];
        try {
          await sequelize.query(
            `INSERT INTO supplier_purchases (organization_id, branch_id, supplier_id, total_amount, payment_status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            { replacements: [ORG_ID, BRANCH_ID, supplier.id, Math.floor(Math.random() * 50000) + 1000, Math.random() > 0.3 ? "paid" : "due"] }
          );
          spCount++;
        } catch (e) { /* ignore */ }
      }
      console.log(`38a. Supplier Purchases: ${spCount}`);
    } catch (e) { console.log("38a. supplier_purchases table skipped"); }

    try {
      let wsCount = 0;
      const reasons = ["Damaged", "Expired", "Spilled", "Broken", "Contaminated", "Leakage", "Spoiled", "Defective", "Quality Issue", "Customer Return", "Sample", "Promotion", "Donation", "Write-off", "Overstock", "Seasonal", "Faulty", "Wrong Item", "Mislabel", "Packaging Error", "Transport Damage", "Storage Issue", "Temperature Abuse", "Humidity Damage", "Pest Infestation", "Mold Growth", "Rust", "Corrosion", "Dent", "Scratch", "Torn Packaging", "Missing Parts", "Incomplete Set", "Wrong Color", "Wrong Size", "Wrong Variant"];
      for (let i = 0; i < TARGET; i++) {
        const prod = allProducts[i % allProducts.length];
        try {
          await sequelize.query(
            `INSERT INTO wastages (organization_id, branch_id, date, item_name, quantity, reason, product_id, amount, created_at, updated_at)
             VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, NOW(), NOW())`,
            { replacements: [ORG_ID, BRANCH_ID, prod.name, Math.floor(Math.random() * 5) + 1, reasons[i % reasons.length], prod.id, Math.floor(Math.random() * 5000) + 100] }
          );
          wsCount++;
        } catch (e) { /* ignore */ }
      }
      console.log(`38b. Wastages: ${wsCount}`);
    } catch (e) { console.log("38b. wastages table skipped"); }

    try {
      let invCount = 0;
      for (let i = 0; i < TARGET; i++) {
        const prod = allProducts[i % allProducts.length];
        const supplier = allSuppliers[i % allSuppliers.length];
        try {
          await sequelize.query(
            `INSERT INTO inventory (organization_id, branch_id, name, category, min_stock, unit, quantity, supplier, cost_price, selling_price, supplier_id, product_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            { replacements: [ORG_ID, BRANCH_ID, prod.name, "General", Math.floor(Math.random() * 10) + 5, "pcs", Math.floor(Math.random() * 100) + 10, supplier.name, Math.floor(Math.random() * 2000) + 100, Math.floor(Math.random() * 3000) + 200, supplier.id, prod.id] }
          );
          invCount++;
        } catch (e) { /* ignore */ }
      }
      console.log(`38c. Inventory: ${invCount}`);
    } catch (e) { console.log("38c. inventory table skipped"); }

    // =====================================================================
    // SUMMARY
    // =====================================================================
    console.log("\n==================== SEED SUMMARY ====================");
    const tables = [
      ["Subscriptions", await Subscription.count()],
      ["Roles", await Role.count({ where: { organizationId: ORG_ID } })],
      ["Customers", await Customer.count({ where: { organizationId: ORG_ID } })],
      ["Suppliers", await Supplier.count({ where: { organizationId: ORG_ID } })],
      ["Categories", await Category.count({ where: { organizationId: ORG_ID } })],
      ["Brands", await Brand.count({ where: { organizationId: ORG_ID } })],
      ["Units", await Unit.count({ where: { organizationId: ORG_ID } })],
      ["Variations", await Variation.count({ where: { organizationId: ORG_ID } })],
      ["Expense Categories", await ExpenseCategory.count({ where: { organizationId: ORG_ID } })],
      ["Staff", await Staff.count({ where: { organizationId: ORG_ID } })],
      ["Users", await User.count({ where: { organizationId: ORG_ID } })],
      ["Products", await Product.count({ where: { organizationId: ORG_ID } })],
      ["Services", await Service.count({ where: { organizationId: ORG_ID } })],
      ["Banks", await Bank.count({ where: { organizationId: ORG_ID } })],
      ["Product Variations", await ProductVariation.count()],
      ["Service Items", await ServiceItem.count()],
      ["Staff Services", await StaffService.count()],
      ["Staff Attachments", await StaffAttachment.count({ where: { organizationId: ORG_ID } })],
      ["User Salaries", await UserSalary.count({ where: { organizationId: ORG_ID } })],
      ["Attendances", await Attendance.count({ where: { organizationId: ORG_ID } })],
      ["Payrolls", await Payroll.count({ where: { organizationId: ORG_ID } })],
      ["Purchases", await Purchase.count({ where: { organizationId: ORG_ID } })],
      ["Purchase Items", await PurchaseItem.count()],
      ["Sales", await Sale.count({ where: { organizationId: ORG_ID } })],
      ["Payments", await Payment.count()],
      ["Sale Returns", await SaleReturn.count({ where: { organizationId: ORG_ID } })],
      ["Purchase Returns", await PurchaseReturn.count({ where: { organizationId: ORG_ID } })],
      ["Stocks", await Stock.count({ where: { organizationId: ORG_ID } })],
      ["Stock Logs", await StockLog.count({ where: { organizationId: ORG_ID } })],
      ["Stock Adjustments", await StockAdjustment.count({ where: { organizationId: ORG_ID } })],
      ["Stock Transfers", await StockTransfer.count({ where: { organizationId: ORG_ID } })],
      ["Bank Transactions", await BankTransaction.count({ where: { organizationId: ORG_ID } })],
      ["Supplier Transactions", await SupplierTransaction.count({ where: { organizationId: ORG_ID } })],
      ["Appointments", await Appointment.count({ where: { organizationId: ORG_ID } })],
      ["Expenses", await Expense.count({ where: { organizationId: ORG_ID } })],
      ["Cash Registers", await CashRegister.count({ where: { organizationId: ORG_ID } })],
      ["Staff Logs", await StaffLog.count({ where: { organizationId: ORG_ID } })],
    ];
    for (const [name, count] of tables) {
      console.log(`  ${name.padEnd(20)} ${count}`);
    }
    console.log("======================================================");
    console.log("Seed completed successfully!");

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();