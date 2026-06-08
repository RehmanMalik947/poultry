require("dotenv").config();
const { sequelize } = require("../config/db");

const ORG_ID = 1;
async function run() {
  await sequelize.authenticate();

  // ========== 50 PRODUCTS ==========
  const prodNames = [
    "Moisture Shampoo","Volumizing Shampoo","Color Protect Shampoo","Sulfate-Free Shampoo","Clarifying Shampoo",
    "Smoothing Conditioner","Repair Conditioner","Daily Conditioner","Deep Conditioner","Leave-In Conditioner",
    "Styling Mousse","Heat Protectant Spray","Hair Wax","Hair Clay","Sea Salt Spray",
    "Dry Shampoo","Texturizing Spray","Root Lifter","Hair Oil Serum","Split End Treatment",
    "Scalp Scrub","Hair Mask","Hair Spray Strong Hold","Hair Spray Medium Hold","Hair Spray Flexible",
    "Shine Spray","Hair Perfume","Scalp Treatment","Hair Tonic","Anti-Hairfall Lotion",
    "Beard Shampoo","Beard Balm","Beard Wax","Beard Oil Premium","Beard Brush",
    "Face Wash Mens","Face Scrub Mens","Aftershave Lotion","Pre-Shave Oil","Shaving Cream",
    "Hand Cream","Body Lotion","Foot Cream","Cuticle Oil","Nail Strengthener",
    "Nail Polish Remover","Base Coat","Top Coat","Matte Top Coat","Quick-Dry Drops",
  ];
  let pc = 0;
  for (let i = 0; i < 50; i++) {
    const name = prodNames[i % prodNames.length] + (i >= prodNames.length ? ` ${Math.floor(i / prodNames.length) + 1}` : "");
    const sku = `PROD-ADD-${String(i + 1).padStart(4, "0")}`;
    try {
      const unitId = 7 + (i % 74);
      await sequelize.query(
        `INSERT INTO products (organization_id,branch_id,unit_id,name,sku,purchase_price_exc,selling_price_exc,product_type,applicable_tax,selling_price_tax_type,created_at,updated_at) 
         VALUES (?,1,?,?,?,?,?,'single','none','exclusive',NOW(),NOW())`,
        { replacements: [ORG_ID, unitId, name, sku, 100 + i * 15, 200 + i * 25] }
      );
      pc++;
    } catch (e) {}
  }
  console.log(`Products: +${pc}`);

  // ========== 50 SERVICES ==========
  const svcNames = [
    "Express Haircut","Kids Haircut","Beard Trim","Mustache Grooming","Head Shave",
    "Highlights Partial","Highlights Full","Baby Lights","Color Gloss","Toner Application",
    "Hair Botox Express","Smoothing Express","Scalp Treatment Deluxe","Hair Spa Silver","Oxygen Therapy",
    "Hydra Facial Express","Anti-Acne Facial","Brightening Facial","Detan Facial","Charcoal Facial",
    "Luxury Manicure","Spa Manicure","French Manicure","Luxury Pedicure","Spa Pedicure",
    "Gel Polish Change","Nail Art Basic","Nail Art Premium","Acrylic Full Set","Acrylic Fill",
    "Shellac Manicure","Shellac Pedicure","Paraffin Wax Hands","Paraffin Wax Feet","Eyebrow Shape",
    "Upper Lip Wax","Full Face Wax","Back Wax","Chest Wax","Arms Wax",
    "Legs Wax Full","Bikini Wax","Brazilian Wax","Facial Bleach","Full Body Bleach",
    "Body Massage 30min","Body Massage 60min","Head Massage 30min","Foot Massage 30min","Hot Oil Therapy",
  ];
  let sc = 0;
  const maxId = await sequelize.query("SELECT COALESCE(MAX(id),0)+1 as n FROM services WHERE organization_id=?", { replacements: [ORG_ID], type: sequelize.QueryTypes.SELECT });
  const offset = maxId[0]?.n || 100;
  for (let i = 0; i < 50; i++) {
    const name = svcNames[i % svcNames.length] + (i >= svcNames.length ? ` ${Math.floor(i / svcNames.length) + 1}` : "");
    const code = `SVC-ADD-${String(i + 1).padStart(4, "0")}`;
    try {
      await sequelize.query(
        `INSERT INTO services (organization_id,branch_id,service_name,service_code,date,price,duration,status,description,created_at,updated_at) 
         VALUES (?,1,?,?,CURDATE(),?,?,'active',?,NOW(),NOW())`,
        { replacements: [ORG_ID, name, code, 250 + i * 20, 15 + i * 2, name] }
      );
      sc++;
    } catch (e) {}
  }
  console.log(`Services: +${sc}`);

  // ========== 50 PACKAGES ==========
  const pkgNames = [
    "Hair Care Bundle","Style & Shave","Color & Cut","Spa Day","Mani-Pedi Combo",
    "Bridal Trial","Grooming Essentials","Relaxation Package","Pamper Session","Refresh Package",
    "Glow Up","Party Ready","Date Night Prep","Wedding Guest","Summer Special",
    "Winter Care","Festival Glam","Mother's Day","Father's Day","Valentine Special",
    "Rainy Day","Beach Ready","Office Look","Weekend Escape","Lunch Break Express",
    "Teen Glow","Silver Care","Men's Power Pack","Ladies' Choice","Unisex Special",
    "Facial & Haircut","Makeup & Style","Full Glam","Quick Fix","Skin & Hair Combo",
    "Nail & Wax","Body & Soul","Detox Session","Renewal Package","Blissful Escape",
    "Couples Massage","Friends' Day Out","Student Saver","Loyalty Reward","New Client Welcome",
    "Birthday Bash","Anniversary Special","Festival Discount","Clearance Package","Premium Luxury",
  ];
  let pkgc = 0;
  for (let i = 0; i < 50; i++) {
    const name = pkgNames[i % pkgNames.length] + (i >= pkgNames.length ? ` ${Math.floor(i / pkgNames.length) + 1}` : "");
    const code = `PKG-ADD-${String(i + 1).padStart(4, "0")}`;
    try {
      await sequelize.query(
        `INSERT INTO packages (organization_id,branch_id,package_name,package_code,price,services,duration,status,description,created_at,updated_at) 
         VALUES (?,1,?,?,?,'[]',60,'active',?,NOW(),NOW())`,
        { replacements: [ORG_ID, name, code, 500 + i * 50, name] }
      );
      pkgc++;
    } catch (e) { /* console.log(e.message) */ }
  }
  console.log(`Packages: +${pkgc}`);

  console.log("\nDone");
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
