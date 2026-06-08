require("dotenv").config();
const { sequelize } = require("../config/db");
const { Category } = require("../models/category");
const { Brand } = require("../models/brand");
const { Unit } = require("../models/unit");
const { Product } = require("../models/product");
const { Service } = require("../models/service");
const { Package } = require("../models/package");

const ORG_ID = 1;
const BRANCH_ID = 1;

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });

    const orgId = ORG_ID;
    const branchId = BRANCH_ID;

    console.log(`Seeding data for Organization ID: ${orgId}, Branch ID: ${branchId}`);

    // ---------- Categories ----------
    const categoryData = [
      { name: "Hair Care", categoryType: "product", description: "Shampoos, conditioners, etc." },
      { name: "Hair Styling", categoryType: "product", description: "Gels, sprays, waxes" },
      { name: "Skin Care", categoryType: "product", description: "Creams, lotions, serums" },
      { name: "Nail Care", categoryType: "product", description: "Polishes, tools" },
      { name: "Men's Grooming", categoryType: "product", description: "Beard oils, razors" },
      { name: "Haircut & Styling", categoryType: "service", description: "Haircut, blow-dry, styling" },
      { name: "Hair Colouring", categoryType: "service", description: "Dye, highlights, balayage" },
      { name: "Hair Treatments", categoryType: "service", description: "Keratin, smoothing, deep conditioning" },
      { name: "Facials & Skin", categoryType: "service", description: "Cleaning, facials, masks" },
      { name: "Nails", categoryType: "service", description: "Manicure, pedicure" },
      { name: "Bridal", categoryType: "service", description: "Bridal makeup & packages" },
    ];

    const categories = {};
    for (const cat of categoryData) {
      const [record] = await Category.findOrCreate({
        where: { organizationId: orgId, name: cat.name },
        defaults: { ...cat, organizationId: orgId, branchId },
      });
      categories[cat.name] = record;
    }
    console.log("Categories created:", Object.keys(categories).length);

    // ---------- Brands ----------
    const brandData = [
      "L'Oreal Professionnel",
      "Wella Professionals",
      "Schwarzkopf",
      "Matrix",
      "Redken",
      "Nexxus",
      "Paul Mitchell",
      "Moroccanoil",
      "Olaplex",
      "OPI",
    ];

    const brands = {};
    for (const name of brandData) {
      const [record] = await Brand.findOrCreate({
        where: { organizationId: orgId, name },
        defaults: { name, organizationId: orgId, branchId },
      });
      brands[name] = record;
    }
    console.log("Brands created:", Object.keys(brands).length);

    // ---------- Units ----------
    const unitData = [
      { name: "Piece", shortName: "Pcs", allowDecimal: false },
      { name: "Bottle", shortName: "Btl", allowDecimal: false },
      { name: "Milliliter", shortName: "ml", allowDecimal: true },
      { name: "Liter", shortName: "L", allowDecimal: true },
      { name: "Gram", shortName: "g", allowDecimal: true },
      { name: "Kilogram", shortName: "kg", allowDecimal: true },
      { name: "Pack", shortName: "Pack", allowDecimal: false },
      { name: "Box", shortName: "Box", allowDecimal: false },
    ];

    const units = {};
    for (const u of unitData) {
      const [record] = await Unit.findOrCreate({
        where: { organizationId: orgId, name: u.name },
        defaults: { ...u, organizationId: orgId, branchId },
      });
      units[u.name] = record;
    }
    console.log("Units created:", Object.keys(units).length);

    // ---------- Products ----------
    const productData = [
      {
        name: "L'Oreal Serie Expert Shampoo",
        sku: "LOR-SH-001",
        brand: "L'Oreal Professionnel",
        category: "Hair Care",
        unit: "Bottle",
        purchasePriceExc: 650,
        sellingPriceExc: 950,
        manageStock: true,
        alertQuantity: 10,
        productDescription: "Professional sulfate-free shampoo for color-treated hair",
      },
      {
        name: "Wella SP Conditioner",
        sku: "WEL-COND-001",
        brand: "Wella Professionals",
        category: "Hair Care",
        unit: "Bottle",
        purchasePriceExc: 700,
        sellingPriceExc: 1050,
        manageStock: true,
        alertQuantity: 10,
        productDescription: "Deep moisturizing conditioner",
      },
      {
        name: "Moroccanoil Treatment",
        sku: "MOR-OIL-001",
        brand: "Moroccanoil",
        category: "Hair Care",
        unit: "Bottle",
        purchasePriceExc: 2500,
        sellingPriceExc: 3800,
        manageStock: true,
        alertQuantity: 5,
        productDescription: "Original argan oil hair treatment",
      },
      {
        name: "Olaplex No.3 Hair Perfector",
        sku: "OLA-003-001",
        brand: "Olaplex",
        category: "Hair Treatments",
        unit: "Bottle",
        purchasePriceExc: 3200,
        sellingPriceExc: 4500,
        manageStock: true,
        alertQuantity: 5,
        productDescription: "At-home bonding treatment",
      },
      {
        name: "Schwarzkopf Got2b Glued Gel",
        sku: "SCH-GEL-001",
        brand: "Schwarzkopf",
        category: "Hair Styling",
        unit: "Piece",
        purchasePriceExc: 350,
        sellingPriceExc: 550,
        manageStock: true,
        alertQuantity: 10,
        productDescription: "Maximum hold styling gel",
      },
      {
        name: "Matrix Biolage Hairspray",
        sku: "MAT-SPR-001",
        brand: "Matrix",
        category: "Hair Styling",
        unit: "Bottle",
        purchasePriceExc: 800,
        sellingPriceExc: 1200,
        manageStock: true,
        alertQuantity: 10,
        productDescription: "Strong hold finishing hairspray",
      },
      {
        name: "OPI Nail Lacquer - Bubble Bath",
        sku: "OPI-NL-001",
        brand: "OPI",
        category: "Nail Care",
        unit: "Bottle",
        purchasePriceExc: 900,
        sellingPriceExc: 1400,
        manageStock: true,
        alertQuantity: 6,
        productDescription: "Classic sheer pink nail polish",
      },
      {
        name: "Redken All Soft Shampoo",
        sku: "RED-SH-001",
        brand: "Redken",
        category: "Hair Care",
        unit: "Bottle",
        purchasePriceExc: 1200,
        sellingPriceExc: 1800,
        manageStock: true,
        alertQuantity: 10,
        productDescription: "Argan oil infused shampoo for dry hair",
      },
      {
        name: "Paul Mitchell Tea Tree Special Shampoo",
        sku: "PM-SH-001",
        brand: "Paul Mitchell",
        category: "Hair Care",
        unit: "Bottle",
        purchasePriceExc: 1500,
        sellingPriceExc: 2200,
        manageStock: true,
        alertQuantity: 8,
        productDescription: "Invigorating tea tree shampoo",
      },
      {
        name: "Nexxus Keraphix Hair Mask",
        sku: "NEX-MASK-001",
        brand: "Nexxus",
        category: "Hair Treatments",
        unit: "Pack",
        purchasePriceExc: 1800,
        sellingPriceExc: 2700,
        manageStock: true,
        alertQuantity: 5,
        productDescription: "Damage repairing protein mask",
      },
    ];

    let productCount = 0;
    for (const p of productData) {
      const [record, created] = await Product.findOrCreate({
        where: { organizationId: orgId, sku: p.sku },
        defaults: {
          organizationId: orgId,
          branchId,
          brandId: brands[p.brand]?.id || null,
          unitId: units[p.unit]?.id || null,
          categoryId: categories[p.category]?.id || null,
          name: p.name,
          sku: p.sku,
          manageStock: p.manageStock,
          alertQuantity: p.alertQuantity,
          productDescription: p.productDescription,
          purchasePriceExc: p.purchasePriceExc,
          sellingPriceExc: p.sellingPriceExc,
          sellingPriceTaxType: "exclusive",
          productType: "single",
          applicableTax: "none",
        },
      });
      if (created) productCount++;
    }
    console.log("Products created:", productCount);

    // ---------- Services ----------
    const serviceData = [
      {
        serviceName: "Classic Haircut",
        serviceCode: "SVC-HC-001",
        category: "Haircut & Styling",
        price: 500,
        duration: 30,
        description: "Basic haircut for men & women",
        status: "active",
      },
      {
        serviceName: "Premium Haircut & Blow-Dry",
        serviceCode: "SVC-HC-002",
        category: "Haircut & Styling",
        price: 1200,
        duration: 45,
        description: "Precision haircut with professional blow-dry",
        status: "active",
      },
      {
        serviceName: "Root Touch-Up",
        serviceCode: "SVC-COL-001",
        category: "Hair Colouring",
        price: 2500,
        duration: 60,
        description: "Single color root touch-up application",
        status: "active",
      },
      {
        serviceName: "Full Head Highlights",
        serviceCode: "SVC-COL-002",
        category: "Hair Colouring",
        price: 5000,
        duration: 120,
        description: "Full head foil highlights",
        status: "active",
      },
      {
        serviceName: "Balayage",
        serviceCode: "SVC-COL-003",
        category: "Hair Colouring",
        price: 7000,
        duration: 150,
        description: "Hand-painted balayage technique",
        status: "active",
      },
      {
        serviceName: "Keratin Smoothing Treatment",
        serviceCode: "SVC-TRT-001",
        category: "Hair Treatments",
        price: 6000,
        duration: 120,
        description: "Formaldehyde-free keratin smoothing",
        status: "active",
      },
      {
        serviceName: "Deep Conditioning Treatment",
        serviceCode: "SVC-TRT-002",
        category: "Hair Treatments",
        price: 1500,
        duration: 30,
        description: "Intensive deep conditioning with steam",
        status: "active",
      },
      {
        serviceName: "Olaplex Bonding Treatment",
        serviceCode: "SVC-TRT-003",
        category: "Hair Treatments",
        price: 3000,
        duration: 60,
        description: "Professional Olaplex stand-alone treatment",
        status: "active",
      },
      {
        serviceName: "Classic Facial",
        serviceCode: "SVC-FCL-001",
        category: "Facials & Skin",
        price: 2000,
        duration: 45,
        description: "Cleanse, exfoliate, mask & moisturize",
        status: "active",
      },
      {
        serviceName: "Gold Facial",
        serviceCode: "SVC-FCL-002",
        category: "Facials & Skin",
        price: 4000,
        duration: 60,
        description: "Luxury gold-infused facial treatment",
        status: "active",
      },
      {
        serviceName: "Classic Manicure",
        serviceCode: "SVC-NAIL-001",
        category: "Nails",
        price: 1000,
        duration: 30,
        description: "Nail shaping, cuticle care & polish",
        status: "active",
      },
      {
        serviceName: "Classic Pedicure",
        serviceCode: "SVC-NAIL-002",
        category: "Nails",
        price: 1500,
        duration: 45,
        description: "Foot soak, exfoliation, nail care & polish",
        status: "active",
      },
      {
        serviceName: "Gel Nails - Full Set",
        serviceCode: "SVC-NAIL-003",
        category: "Nails",
        price: 2000,
        duration: 60,
        description: "Full gel extension with color",
        status: "active",
      },
      {
        serviceName: "Bridal Makeup",
        serviceCode: "SVC-BRIDE-001",
        category: "Bridal",
        price: 15000,
        duration: 120,
        description: "Full bridal makeup with trial",
        status: "active",
      },
      {
        serviceName: "Bridal Hairstyling",
        serviceCode: "SVC-BRIDE-002",
        category: "Bridal",
        price: 8000,
        duration: 90,
        description: "Bridal updo/styling with accessories",
        status: "active",
      },
    ];

    let serviceCount = 0;
    for (const s of serviceData) {
      const [record, created] = await Service.findOrCreate({
        where: { organizationId: orgId, serviceCode: s.serviceCode },
        defaults: {
          organizationId: orgId,
          branchId,
          serviceName: s.serviceName,
          serviceCode: s.serviceCode,
          category: s.category,
          categoryId: categories[s.category]?.id || null,
          price: s.price,
          duration: s.duration,
          description: s.description,
          status: s.status,
          date: new Date().toISOString().split("T")[0],
        },
      });
      if (created) serviceCount++;
    }
    console.log("Services created:", serviceCount);

    // ---------- Packages ----------
    // First, let's fetch services to get their IDs for package-service mapping
    const allServices = await Service.findAll({
      where: { organizationId: orgId },
    });

    const serviceMap = {};
    for (const s of allServices) {
      serviceMap[s.serviceCode] = s.id;
    }

    const packageData = [
      {
        packageName: "Pamper Me Package",
        packageCode: "PKG-PMP-001",
        price: 3500,
        description: "Classic haircut + deep conditioning + manicure",
        services: [
          { serviceCode: "SVC-HC-001", quantity: 1 },
          { serviceCode: "SVC-TRT-002", quantity: 1 },
          { serviceCode: "SVC-NAIL-001", quantity: 1 },
        ],
      },
      {
        packageName: "Color & Care Package",
        packageCode: "PKG-CC-001",
        price: 8000,
        discountType: "fixed",
        discount: 500,
        description: "Root touch-up + Olaplex treatment + blow-dry",
        services: [
          { serviceCode: "SVC-COL-001", quantity: 1 },
          { serviceCode: "SVC-TRT-003", quantity: 1 },
          { serviceCode: "SVC-HC-002", quantity: 1 },
        ],
      },
      {
        packageName: "Bridal Glow Package",
        packageCode: "PKG-BRIDE-001",
        price: 30000,
        discountType: "percentage",
        discount: 10,
        description: "Bridal makeup + hairstyling + gold facial + manicure + pedicure",
        services: [
          { serviceCode: "SVC-BRIDE-001", quantity: 1 },
          { serviceCode: "SVC-BRIDE-002", quantity: 1 },
          { serviceCode: "SVC-FCL-002", quantity: 1 },
          { serviceCode: "SVC-NAIL-001", quantity: 1 },
          { serviceCode: "SVC-NAIL-002", quantity: 1 },
        ],
      },
      {
        packageName: "Hair Makeover Package",
        packageCode: "PKG-HM-001",
        price: 15000,
        discountType: "fixed",
        discount: 1000,
        description: "Full highlights + keratin treatment + premium haircut",
        services: [
          { serviceCode: "SVC-COL-002", quantity: 1 },
          { serviceCode: "SVC-TRT-001", quantity: 1 },
          { serviceCode: "SVC-HC-002", quantity: 1 },
        ],
      },
      {
        packageName: "Men's Grooming Package",
        packageCode: "PKG-MEN-001",
        price: 2000,
        description: "Classic haircut + facial",
        services: [
          { serviceCode: "SVC-HC-001", quantity: 1 },
          { serviceCode: "SVC-FCL-001", quantity: 1 },
        ],
      },
    ];

    let packageCount = 0;
    for (const pkg of packageData) {
      const mappedServices = pkg.services
        .filter((s) => serviceMap[s.serviceCode])
        .map((s) => ({ serviceId: serviceMap[s.serviceCode], quantity: s.quantity }));

      const totalDuration = mappedServices.reduce((sum, s) => {
        const svc = allServices.find((sv) => sv.id === s.serviceId);
        return sum + (svc ? svc.duration * s.quantity : 0);
      }, 0);

      const [record, created] = await Package.findOrCreate({
        where: { organizationId: orgId, packageCode: pkg.packageCode },
        defaults: {
          organizationId: orgId,
          branchId,
          packageName: pkg.packageName,
          packageCode: pkg.packageCode,
          price: pkg.price,
          discountType: pkg.discountType || null,
          discount: pkg.discount || 0,
          description: pkg.description,
          services: mappedServices,
          duration: totalDuration,
          status: "active",
        },
      });
      if (created) packageCount++;
    }
    console.log("Packages created:", packageCount);

    console.log("\n=== Seed Summary ===");
    console.log("Organization ID:", orgId);
    console.log("Branch ID:", branchId);
    console.log("Categories:", Object.keys(categories).length);
    console.log("Brands:", Object.keys(brands).length);
    console.log("Units:", Object.keys(units).length);
    console.log("New Products:", productCount);
    console.log("New Services:", serviceCount);
    console.log("New Packages:", packageCount);
    console.log("\nSeed completed successfully!");

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
