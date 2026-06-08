require("dotenv").config();
const { sequelize } = require("../config/db");

const ORG_ID = 1;
async function run() {
  await sequelize.authenticate();

  const prodNames = [
    "Argan Oil Shampoo","Coconut Shampoo","Tea Tree Shampoo","Biotin Shampoo","Keratin Shampoo",
    "Argan Conditioner","Coconut Conditioner","Tea Tree Conditioner","Biotin Conditioner","Keratin Conditioner",
    "Pomade","Hair Gel Strong","Hair Gel Medium","Hair Cream","Curl Cream",
    "Anti-Frizz Serum","Hair Primer","Hair Mist","Scalp Oil","Hair Growth Serum",
    "Blow Dry Lotion","Styling Paste","Hair Powder","Hair Chalk","Hair Glitter Spray",
    "Temporary Color Spray","Hair Wax Stick","Edge Control","Hair Band","Hair Clips Set",
    "Detangling Brush","Wide Tooth Comb","Fine Tooth Comb","Rat Tail Comb","Paddle Brush",
    "Round Brush","Thermal Brush","Hair Dryer","Diffuser","Straightening Iron",
    "Curling Iron","Hair Rollers","Hair Towel","Satin Pillowcase","Hair Net",
    "Shower Cap","Hair Dye Brush","Color Bowl","Sectioning Clips","Hair Ties Pack",
  ];
  
  let pc = 0;
  for (let i = 0; i < 50; i++) {
    const name = prodNames[i];
    const sku = `PROD-FINAL-${String(i + 1).padStart(4, "0")}`;
    const unitId = 7 + (i % 74);
    try {
      await sequelize.query(
        `INSERT INTO products (organization_id,branch_id,unit_id,name,sku,purchase_price_exc,selling_price_exc,product_type,applicable_tax,selling_price_tax_type,created_at,updated_at) 
         VALUES (?,1,?,?,?,?,?,'single','none','exclusive',NOW(),NOW())`,
        { replacements: [ORG_ID, unitId, name, sku, 150 + i * 10, 300 + i * 20] }
      );
      pc++;
    } catch (e) { /* console.log(e.parent?.sqlMessage) */ }
  }
  console.log(`Products: +${pc} (total new)`);
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
