require("dotenv").config();
const { sequelize } = require("../config/db");
const { Subscription } = require("../models/subscription");
const { Organization, Branch, User, Customer, Category, Brand, Unit, Product, Service, Package, Role, Staff, Supplier, Bank, Variation, ProductVariation, Stock, StockLog, StockAdjustment, StockTransfer, Appointment, Attendance, UserSalary, Payroll, PayrollBonusDeduction, ExpenseCategory, Expense, Purchase, PurchaseItem, PurchaseReturn, PurchaseReturnItem, PurchaseReturnPayment, Sale, SaleItem, SaleReturn, SaleReturnItem, SaleReturnPayment, Payment, BankTransaction, SupplierTransaction, ServiceItem, StaffService, StaffLog } = require("../models");
const bcrypt = require("bcryptjs");

const ORG_ID = 1;
const TARGET = 50;

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("Connected\n");

    // ===== 1. BRANCHES (need 50 total, current ~5) =====
    const branchCount = await Branch.count({ where: { organizationId: ORG_ID } });
    const branchesNeeded = Math.max(0, TARGET - branchCount);
    if (branchesNeeded > 0) {
      const branchData = [];
      for (let i = branchCount + 1; i <= branchCount + branchesNeeded; i++) {
        branchData.push({ name: `Branch ${String(i).padStart(3, "0")}`, code: `BR${String(i).padStart(3, "0")}`, address: `Address ${i}, Lahore`, phone: `0300${String(10000000 + i).slice(0, 8)}`, organizationId: ORG_ID });
      }
      await Branch.bulkCreate(branchData, { ignoreDuplicates: true });
      console.log(`Branches: +${branchesNeeded}`);
    }
    const allBranches = await Branch.findAll({ where: { organizationId: ORG_ID } });

    // ===== 2. BRANDS (need 50 total, current ~31) =====
    const brandCount = await Brand.count({ where: { organizationId: ORG_ID } });
    const brandsNeeded = Math.max(0, TARGET - brandCount);
    if (brandsNeeded > 0) {
      const names = ["Tigi","Aveda","Joico","Bumble and Bumble","Kérastase","Phyto","Rene Furterer","Alterna","Living Proof","Pureology","Essie","CND","Sally Hansen","China Glaze","Orly","Becca","Fenty Skin","The Ordinary","Neutrogena","CeraVe","La Roche-Posay","Vichy","Bioderma","Avene","SkinCeuticals","Dr Dennis Gross","Paula's Choice","Dermablend","NARS","Too Faced","Urban Decay","Anastasia Beverly Hills","Benefit","Huda Beauty","Charlotte Tilbury","Il Makiage","Bobbi Brown","Shu Uemura","GHD","Babyliss",]
        .slice(brandsNeeded * -1);
      const data = names.slice(0, brandsNeeded).map(n => ({ name: n, organizationId: ORG_ID, branchId: 1 }));
      await Brand.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Brands: +${brandsNeeded}`);
    }
    const allBrands = await Brand.findAll({ where: { organizationId: ORG_ID } });

    // ===== 3. CATEGORIES (need 50 total, current ~47) =====
    const catCount = await Category.count({ where: { organizationId: ORG_ID } });
    const catsNeeded = Math.max(0, TARGET - catCount);
    if (catsNeeded > 0) {
      const names = ["Eye Makeup","Lip Care","Body Care","Sun Care","Organic","Professional Tools","Accessories","Gift Sets","Travel Kits","Men's Fragrance","Women's Fragrance","Hair Accessories"];
      const data = names.slice(0, catsNeeded).map(n => ({ name: n, categoryType: "product", description: n, organizationId: ORG_ID, branchId: 1 }));
      await Category.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Categories: +${catsNeeded}`);
    }
    const allCategories = await Category.findAll({ where: { organizationId: ORG_ID } });

    // ===== 4. UNITS (need 50 total, current ~20) =====
    const unitCount = await Unit.count({ where: { organizationId: ORG_ID } });
    const unitsNeeded = Math.max(0, TARGET - unitCount);
    if (unitsNeeded > 0) {
      const data = [];
      for (let i = 1; i <= unitsNeeded; i++) {
        const l = String.fromCharCode(64 + i);
        data.push({ name: `Unit ${l}`, shortName: l, allowDecimal: i % 3 === 0, organizationId: ORG_ID, branchId: 1 });
      }
      await Unit.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Units: +${unitsNeeded}`);
    }
    const allUnits = await Unit.findAll({ where: { organizationId: ORG_ID } });

    // ===== 5. VARIATIONS (need 50 total, current ~12) =====
    const varCount = await Variation.count({ where: { organizationId: ORG_ID } });
    const varsNeeded = Math.max(0, TARGET - varCount);
    if (varsNeeded > 0) {
      const data = [];
      const vnames = ["Length","Width","Height","Material","Flavor","Scent","Finish","Formula","Concentration","Package","Format","Edition","Series","Grade","Quality","Level","Intensity","Speed","Temperature","Weight","Volume","Strength","Application","Frequency","Duration","Coverage","Texture","Shine","Hold","Absorption","Consistency","Pigment","Shade","Tone","Opacity","Stretch","Fit","Pattern"];
      for (let i = 0; i < varsNeeded; i++) {
        data.push({ name: vnames[i % vnames.length] + (Math.floor(i / vnames.length) > 0 ? ` ${Math.floor(i / vnames.length)}` : ""), values: JSON.stringify(["Value A","Value B","Value C"]), organizationId: ORG_ID, branchId: 1 });
      }
      await Variation.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Variations: +${varsNeeded}`);
    }
    const allVariations = await Variation.findAll({ where: { organizationId: ORG_ID } });

    // ===== 6. EXPENSE CATEGORIES (need 50 total, current ~16) =====
    const ecCount = await ExpenseCategory.count({ where: { organizationId: ORG_ID } });
    const ecNeeded = Math.max(0, TARGET - ecCount);
    if (ecNeeded > 0) {
      const names = ["Office Supplies","Transportation","Training","Staff Welfare","Uniforms","Decoration","Events","Consultant Fees","Legal Fees","Accounting Fees","Bank Charges","Credit Card Fees","Interest","Taxes","Software Subscriptions","IT Services","Website","Hosting","Domain","Phone","Postage","Printing","Stationery","Furniture","Equipment Lease","Security","Janitorial","Parking","Travel","Accommodation","Meals","Entertainment","Gifts","Donations","Staff Party","Team Building"];
      const data = names.slice(0, ecNeeded).map(n => ({ name: n, description: n, organizationId: ORG_ID, branchId: 1 }));
      await ExpenseCategory.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Expense Categories: +${ecNeeded}`);
    }
    const allExpenseCats = await ExpenseCategory.findAll({ where: { organizationId: ORG_ID } });

    // ===== 7. SUBSCRIPTIONS (need 50 total, current ~6) =====
    const subCount = await Subscription.count();
    const subsNeeded = Math.max(0, TARGET - subCount);
    if (subsNeeded > 0) {
      const data = [];
      const tiers = ["Starter","Bronze","Silver","Gold","Platinum","Diamond","Enterprise","Ultimate"];
      for (let i = 0; i < subsNeeded; i++) {
        const t = tiers[i % tiers.length];
        const n = Math.floor(i / tiers.length) + 1;
        data.push({ name: `${t} Plan ${n}`, durationDays: (n * 30) + (i * 5), price: 9.99 + (i * 10) });
      }
      await Subscription.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Subscriptions: +${subsNeeded}`);
    }

    // ===== 8. CUSTOMERS (need 50 total, current ~43) =====
    const custCount = await Customer.count({ where: { organizationId: ORG_ID } });
    const custsNeeded = Math.max(0, TARGET - custCount);
    if (custsNeeded > 0) {
      const data = [];
      const fn = ["Aamir","Babbar","Chand","Danish","Ehsan","Fawad","Ghulam","Haseeb","Irfan","Javed","Kashif","Liaqat","Mubashir","Nadeem","Obaid","Pervaiz","Qadir","Rashid","Sajid","Tahir","Umair","Waqar","Yasir","Zubair","Adnan","Bilal","Cyrus","Daniyal","Ezaz","Farhan","Gohar","Hanif","Ismail","Junaid","Khalid","Luqman","Mansoor","Nasir","Owais","Parvez","Qasim","Rizwan","Saadat","Tariq","Uzair","Waseem","Yousuf","Zahid","Akbar","Bashir"];
      const ln = ["Arain","Bajwa","Cheema","Dhindsa","Ehsan","Farooqi","Gill","Hashmi","Iqbal","Jutt","Khawaja","Langah","Malik","Niazi","Omar","Paracha","Qazi","Raja","Sethi","Tareen","Uddin","Virk","Waris","Yaqub","Zaman","Abbasi","Butt","Chaudhry","Dar","Elahi","Fazal","Gondal","Hussain","Jatoi","Kakar","Lashari","Magsi","Nawaz","Orakzai","Palijo","Qureshi","Rind","Sahito","Talpur","Umrani","Vighio","Wattoo","Yousafzai","Zardari"];
      for (let i = 0; i < custsNeeded; i++) {
        data.push({
          organizationId: ORG_ID, branchId: 1,
          name: fn[i % fn.length] + " " + ln[i % ln.length],
          email: `cust${i + custCount + 1}@email.com`,
          mobile: `0300${String(10000000 + i + custCount).slice(0, 8)}`,
          visits: Math.floor(Math.random() * 20), totalSpent: Math.floor(Math.random() * 50000),
          customerGroup: i % 3 === 0 ? "Wholesale" : "Retail",
          creditLimit: Math.floor(Math.random() * 100000),
        });
      }
      await Customer.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Customers: +${custsNeeded}`);
    }
    const allCustomers = await Customer.findAll({ where: { organizationId: ORG_ID } });

    // ===== 9. USERS (need 50 total, current ~2) =====
    const userCount = await User.count({ where: { organizationId: ORG_ID } });
    const usersNeeded = Math.max(0, TARGET - userCount);
    if (usersNeeded > 0) {
      const hashedPw = await bcrypt.hash("User@123", 10);
      const data = [];
      const roles = ["ADMIN","MANAGER","STAFF","CASHIER"];
      for (let i = 0; i < usersNeeded; i++) {
        const branch = allBranches[i % allBranches.length];
        data.push({
          name: `User ${i + userCount + 1}`, username: `user${i + userCount + 1}`,
          email: `user${i + userCount + 1}@salon.com`, password: hashedPw,
          organizationId: ORG_ID, branchId: branch.id,
          role: roles[i % roles.length],
        });
      }
      await User.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Users: +${usersNeeded}`);
    }
    const allUsers = await User.findAll({ where: { organizationId: ORG_ID } });

    // ===== 10. ROLES (need 50 total, current ~9) =====
    const roleCount = await Role.count({ where: { organizationId: ORG_ID } });
    const rolesNeeded = Math.max(0, TARGET - roleCount);
    if (rolesNeeded > 0) {
      const names = ["Junior Barber","Senior Barber","Junior Stylist","Senior Stylist","Master Stylist","Color Specialist","Bridal Specialist","Nail Artist","Spa Therapist","Makeup Artist","Esthetician","Massage Therapist","Salon Manager","Assistant Manager","Floor Manager","Front Desk","Bookkeeper","Inventory Clerk","Marketing","Social Media","Photographer","Trainer","Apprentice","Intern","Cleaning Staff","Supervisor","Team Lead","Department Head","Operations Manager","Regional Manager","Training Manager","Quality Control","Procurement","Warehouse","Driver","IT Support","HR Assistant","Accountant","Auditor","Security","Receptionist"];
      const samplePerms = JSON.stringify(["pos_view","pos_create_service"]);
      const data = names.slice(0, rolesNeeded).map(n => ({ name: n, organizationId: ORG_ID, permissions: samplePerms }));
      await Role.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Roles: +${rolesNeeded}`);
    }

    // ===== 11. STAFF (need 50 total, current ~13) =====
    const staffCount = await Staff.count({ where: { organizationId: ORG_ID } });
    const staffNeeded = Math.max(0, TARGET - staffCount);
    if (staffNeeded > 0) {
      const fn = ["Arif","Barkat","Chotu","Dilshad","Ejaz","Firdous","Ghafoor","Hameed","Ilyas","Jamshaid","Kaleem","Latif","Mustafa","Nazir","Parveen","Rashida","Sakeena","Tabassum","Uzma","Waheeda","Yasmeen","Zubaida","Anjum","Bushra","Celina","Dur-e-Nayab","Fakhra","Gulshan","Hina","Ismat","Jahan","Kausar","Lubna","Mehwish","Naheed","Parveen","Qaisara","Rubina","Shabnam","Tahira"];
      const staffRoles = ["Barber","Hairdresser","Receptionist","Nail Technician","Shampoo Boy","Junior Stylist","Senior Stylist","Color Specialist","Makeup Artist","Therapist"];
      const userArr = await User.findAll({ where: { organizationId: ORG_ID }, limit: staffNeeded });
      const data = [];
      for (let i = 0; i < staffNeeded; i++) {
        data.push({
          organizationId: ORG_ID, branchId: allBranches[i % allBranches.length].id,
          firstName: fn[i % fn.length], lastName: "Staff",
          email: `staff${i + staffCount + 1}@salon.com`,
          role: staffRoles[i % staffRoles.length],
          commissionType: "percentage", commissionValue: 5 + (i % 10),
          isActive: true, mobileNumber: `0300${String(40000000 + i).slice(0, 8)}`,
          workingDays: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]),
          startTime: "09:00", endTime: "18:00",
          user_id: userArr[i]?.id || null,
        });
      }
      await Staff.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Staff: +${staffNeeded}`);
    }
    const allStaff = await Staff.findAll({ where: { organizationId: ORG_ID } });

    // ===== 12. SERVICES (need 50 total, current ~28) =====
    const svcCount = await Service.count({ where: { organizationId: ORG_ID } });
    const svcsNeeded = Math.max(0, TARGET - svcCount);
    if (svcsNeeded > 0) {
      const svcNames = [
        ["Scalp Treatment","Hair Spa","Hair Botox","Hair Lamination","Hair Extensions","Hair Straightening","Hair Perming","Hair Rebonding", "Cysteine Treatment","Protein Treatment","Scalp Massage","Hair Toning","Root Shadow","Color Correction","Ombre","Sombre","Balayage Highlights","Foil Highlights","Babylights","Microblading","Microshading", "Lash Extensions","Lash Lift","Brow Lamination","Brow Tint","Threading","Waxing Full Body","Waxing Half Body","Rica Facial","Oxygen Facial","Diamond Facial","Pearl Facial","Fruit Facial","Charcoal Facial","Anti-Aging Facial","HydraFacial","LED Therapy","Chemical Peel","Microdermabrasion","Dermaplaning","Cryotherapy","Body Scrub","Body Wrap","Hot Stone Massage","Aromatherapy Massage","Swedish Massage","Deep Tissue Massage","Head Massage","Foot Reflexology"]
      ].flat();
      const catArr = await Category.findAll({ where: { organizationId: ORG_ID, categoryType: "service" } });
      const data = svcNames.slice(0, svcsNeeded).map((n, i) => ({
        organizationId: ORG_ID, branchId: 1, serviceName: n,
        serviceCode: `SVC-BAT-${String(i + 1).padStart(3, "0")}`,
        categoryId: catArr[i % catArr.length]?.id || null, category: catArr[i % catArr.length]?.name || "General",
        price: 300 + (i * 150), duration: 15 + (i * 5), status: "active",
        date: new Date().toISOString().split("T")[0], description: n,
      }));
      await Service.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Services: +${svcsNeeded}`);
    }
    const allServices = await Service.findAll({ where: { organizationId: ORG_ID } });

    // ===== 13. PRODUCTS (already 97, so >= 50) =====

    // ===== 14. SUPPLIERS (need 50 total, current ~8) =====
    const supCount = await Supplier.count({ where: { organizationId: ORG_ID } });
    const supsNeeded = Math.max(0, TARGET - supCount);
    if (supsNeeded > 0) {
      const data = [];
      for (let i = 0; i < supsNeeded; i++) {
        data.push({
          organizationId: ORG_ID, branchId: allBranches[i % allBranches.length].id,
          name: `Supplier ${i + supCount + 1}`,
          businessName: `Biz ${i + supCount + 1}`,
          email: `supplier${i + supCount + 1}@example.com`,
          phone: `042-${String(1000000 + i).slice(0, 7)}`,
          taxNumber: `SUP-${String(2000 + i)}`,
          payTerm: 30 + (i % 3) * 15, payTermType: i % 2 === 0 ? "days" : "months",
        });
      }
      await Supplier.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Suppliers: +${supsNeeded}`);
    }
    const allSuppliers = await Supplier.findAll({ where: { organizationId: ORG_ID } });

    // ===== 15. BANKS (need 50 total, current ~9) =====
    const bankCount = await Bank.count({ where: { organizationId: ORG_ID } });
    const banksNeeded = Math.max(0, TARGET - bankCount);
    if (banksNeeded > 0) {
      const bankNames = ["National Bank","JS Bank","Soneri Bank","Silk Bank","Sindh Bank","Punjab Bank","Faysal Bank","Bank of Punjab","Bank of Khyber","Summit Bank","Samba Bank","Dubai Islamic","Meezan Bank","Al Baraka","Bank Islami","MCB Islamic","HBL Islamic","Askari Bank","Habib Metro","Burj Bank","Standard Chartered","Citi Bank","Deutsche Bank","Bank Al Habib","FINCA","Telenor Bank","JazzCash","Easypaisa","Keystone","Bank of China","Barclays","HSBC","RBS","ABN AMRO","Credit Suisse","UBS","BNP Paribas","Citi N.A.","Bank of America","Chase","Wells Fargo","Santander","BBVA","ING Group","Societe Generale","MUFG","Mizuho","SMBC","DBS Bank"];
      const accountTypes = ["Current","Savings","Current","Savings","Current","Current","Savings"];
      const data = bankNames.slice(0, banksNeeded).map((n, i) => ({
        organizationId: ORG_ID, branchId: allBranches[i % allBranches.length].id,
        bankName: n, accountHolder: `Account ${i + 1}`,
        accountType: accountTypes[i % accountTypes.length],
        accountNumber: `${n.substring(0, 3).toUpperCase()}-${String(1000000 + i).slice(0, 7)}`,
        balance: Math.floor(Math.random() * 500000), status: "Active",
      }));
      await Bank.bulkCreate(data, { ignoreDuplicates: true });
      console.log(`Banks: +${banksNeeded}`);
    }
    const allBanks = await Bank.findAll({ where: { organizationId: ORG_ID } });

    // ===== 16. STAFF-SERVICES (need 50 total, current ~6) =====
    const ssCount = await StaffService.count();
    const ssNeeded = Math.max(0, TARGET - ssCount);
    if (ssNeeded > 0) {
      let c = 0;
      for (const staff of allStaff) {
        for (const svc of allServices) {
          if (c >= ssNeeded) break;
          try {
            await StaffService.findOrCreate({
              where: { staffId: staff.id, serviceId: svc.id },
              defaults: { staffId: staff.id, serviceId: svc.id, commissionType: "percentage", commissionValue: 5 + Math.floor(Math.random() * 10) }
            });
            c++;
          } catch (e) { /* ignore */ }
        }
        if (c >= ssNeeded) break;
      }
      console.log(`Staff-Services: +${c}`);
    }

    // ===== 17. SERVICE-ITEMS (need 50 total, current ~9) =====
    const siCount = await ServiceItem.count();
    const siNeeded = Math.max(0, TARGET - siCount);
    if (siNeeded > 0) {
      const allProds = await Product.findAll({ where: { organizationId: ORG_ID } });
      let c = 0;
      for (const svc of allServices) {
        for (const prod of allProds) {
          if (c >= siNeeded) break;
          try {
            await ServiceItem.findOrCreate({
              where: { serviceId: svc.id, productId: prod.id },
              defaults: { serviceId: svc.id, productId: prod.id, quantity: 0.5 + Math.random() }
            });
            c++;
          } catch (e) { /* ignore */ }
        }
        if (c >= siNeeded) break;
      }
      console.log(`Service-Items: +${c}`);
    }

    // ===== 18. PURCHASES + PURCHASE ITEMS (need 50 total each) =====
    const purchCount = await Purchase.count({ where: { organizationId: ORG_ID } });
    const purchsNeeded = Math.max(0, TARGET - purchCount);
    if (purchsNeeded > 0) {
      const allProds = await Product.findAll({ where: { organizationId: ORG_ID } });
      for (let i = 0; i < purchsNeeded; i++) {
        const sup = allSuppliers[i % allSuppliers.length];
        const totalAmount = Math.floor(Math.random() * 80000) + 5000;
        try {
          const purch = await Purchase.create({
            organizationId: ORG_ID, branchId: allBranches[i % allBranches.length].id,
            supplierId: sup.id, referenceNo: `PO-BAT-${String(i + purchCount + 1).padStart(4, "0")}`,
            purchaseDate: new Date(), status: "received",
            totalAmount, paidAmount: Math.random() > 0.3 ? totalAmount : totalAmount * 0.5,
            paymentStatus: Math.random() > 0.3 ? "paid" : "partial",
          });
          const numItems = 1 + Math.floor(Math.random() * 3);
          for (let j = 0; j < numItems; j++) {
            const prod = allProds[j % allProds.length];
            const qty = 1 + Math.floor(Math.random() * 10);
            const cost = Math.floor(Math.random() * 1000) + 50;
            await PurchaseItem.create({
              purchaseId: purch.id, productId: prod.id,
              name: prod.name, quantity: qty, unitCost: cost,
              sellingPrice: cost * 1.3, lineTotal: qty * cost,
            });
          }
        } catch (e) { /* ignore */ }
      }
      console.log(`Purchases + Items: +${purchsNeeded}`);
    }

    // ===== 19. SALES (already 187+ and 300+ sale items) =====

    // ===== 20. PACKAGES (need 50 total, current ~10) =====
    const pkgCount = await Package.count({ where: { organizationId: ORG_ID } });
    const pkgsNeeded = Math.max(0, TARGET - pkgCount);
    if (pkgsNeeded > 0) {
      for (let i = 0; i < pkgsNeeded; i++) {
        const numSvcs = 2 + Math.floor(Math.random() * 4);
        const selSvcs = [];
        let totalDur = 0;
        let totalPrice = 0;
        for (let j = 0; j < numSvcs; j++) {
          const s = allServices[Math.floor(Math.random() * allServices.length)];
          selSvcs.push({ serviceId: s.id, quantity: 1 });
          totalDur += (s.duration || 30);
          totalPrice += (s.price || 0);
        }
        try {
          await Package.create({
            organizationId: ORG_ID, branchId: 1,
            packageName: `Package ${i + pkgCount + 1}`,
            packageCode: `PKG-BAT-${String(i + pkgCount + 1).padStart(3, "0")}`,
            price: Math.round(totalPrice * 0.8), discountType: i % 3 === 0 ? "percentage" : null,
            discount: i % 3 === 0 ? 10 : 0, status: "active",
            description: `Bundled package of ${numSvcs} services`,
            services: JSON.stringify(selSvcs), duration: totalDur,
          });
        } catch (e) { /* ignore */ }
      }
      console.log(`Packages: +${pkgsNeeded}`);
    }

    // ===== 21. STOCKS (need 50 total, current ~22) =====
    const stkCount = await Stock.count({ where: { organizationId: ORG_ID } });
    const stksNeeded = Math.max(0, TARGET - stkCount);
    if (stksNeeded > 0) {
      const allProds = await Product.findAll({ where: { organizationId: ORG_ID } });
      let c = 0;
      for (const prod of allProds) {
        if (c >= stksNeeded) break;
        for (const br of allBranches) {
          if (c >= stksNeeded) break;
          try {
            await Stock.findOrCreate({
              where: { organizationId: ORG_ID, branchId: br.id, productId: prod.id },
              defaults: { organizationId: ORG_ID, branchId: br.id, productId: prod.id, qty: Math.floor(Math.random() * 100), alertQty: Math.floor(Math.random() * 20) + 5 }
            });
            c++;
          } catch (e) { /* ignore */ }
        }
      }
      console.log(`Stocks: +${c}`);
    }

    // ===== 22. STOCK LOGS (already 189+) =====

    // ===== 23. STOCK ADJUSTMENTS (need 50 total, current ~8) =====
    const saCount = await StockAdjustment.count({ where: { organizationId: ORG_ID } });
    const saNeeded = Math.max(0, TARGET - saCount);
    if (saNeeded > 0) {
      const reasons = ["Damaged","Expired","Missing","Broken","Theft","Spoilage","Counting Error","Return to Supplier","Quality Issue","Sample","Promotion","Donation","Write-off","Transfer Loss","Overstock Adjustment","Seasonal Clearance","Manufacturing Defect","Packaging Damage","Leakage","Recall","Obsolescence","Temperature Damage","Water Damage","Fire Damage","Mold","Pest Damage"];
      for (let i = 0; i < saNeeded; i++) {
        try {
          await StockAdjustment.create({
            organizationId: ORG_ID, branchId: allBranches[i % allBranches.length].id,
            referenceNo: `ADJ-BAT-${String(i + saCount + 1).padStart(4, "0")}`,
            adjustmentType: i % 5 === 0 ? "Abnormal" : "Normal",
            reason: reasons[i % reasons.length],
            totalAmount: Math.floor(Math.random() * 20000) + 500,
          });
        } catch (e) { /* ignore */ }
      }
      console.log(`Stock Adjustments: +${saNeeded}`);
    }

    // ===== 24. STOCK TRANSFERS (need 50 total, current ~5) =====
    const stCount = await StockTransfer.count({ where: { organizationId: ORG_ID } });
    const stNeeded = Math.max(0, TARGET - stCount);
    if (stNeeded > 0) {
      for (let i = 0; i < stNeeded; i++) {
        const fromBr = allBranches[i % allBranches.length];
        const toBr = allBranches[(i + 3) % allBranches.length];
        try {
          await StockTransfer.create({
            organizationId: ORG_ID, fromBranchId: fromBr.id, toBranchId: toBr.id,
            referenceNo: `TRF-BAT-${String(i + stCount + 1).padStart(4, "0")}`,
            status: i % 4 === 0 ? "Pending" : "Completed",
            notes: `Stock transfer for balancing`,
          });
        } catch (e) { /* ignore */ }
      }
      console.log(`Stock Transfers: +${stNeeded}`);
    }

    // ===== 25. USER SALARIES (need 50 total, current ~22) =====
    const usCount = await UserSalary.count({ where: { organizationId: ORG_ID } });
    const usNeeded = Math.max(0, TARGET - usCount);
    if (usNeeded > 0) {
      const salaryTypes = ["monthly","weekly","daily"];
      let c = 0;
      for (const staff of allStaff) {
        if (c >= usNeeded) break;
        const effectiveFrom = new Date(2026, Math.floor(c / allStaff.length) % 12, 1);
        try {
          await UserSalary.findOrCreate({
            where: { staffId: staff.id, effectiveFrom: effectiveFrom.toISOString().split("T")[0] },
            defaults: {
              organizationId: ORG_ID, branchId: 1, staffId: staff.id,
              salaryType: salaryTypes[c % salaryTypes.length],
              amount: 15000 + (c * 1000), effectiveFrom: effectiveFrom.toISOString().split("T")[0], status: "active",
            }
          });
          c++;
        } catch (e) { /* ignore */ }
      }
      console.log(`User Salaries: +${c}`);
    }

    // ===== 26. PAYROLLS (need 50 total, current ~27) + BONUS/DEDUCTIONS =====
    const prCount = await Payroll.count({ where: { organizationId: ORG_ID } });
    const prNeeded = Math.max(0, TARGET - prCount);
    if (prNeeded > 0) {
      let c = 0;
      for (const staff of allStaff) {
        if (c >= prNeeded) break;
        for (const month of [1, 2, 6, 7, 8, 9, 10, 11, 12]) {
          if (c >= prNeeded) break;
          const baseSalary = 20000 + Math.floor(Math.random() * 30000);
          const bonus = Math.random() > 0.6 ? Math.floor(Math.random() * 5000) : 0;
          const deduction = Math.random() > 0.7 ? Math.floor(Math.random() * 3000) : 0;
          try {
            const [rec, created] = await Payroll.findOrCreate({
              where: { staffId: staff.id, month, year: 2026 },
              defaults: {
                organizationId: ORG_ID, branchId: 1, staffId: staff.id,
                month, year: 2026, baseSalary, bonus, deduction,
                netSalary: baseSalary + bonus - deduction,
                status: "paid", paidAt: `${2026}-${String(month).padStart(2, "0")}-05`,
              }
            });
            if (created) {
              c++;
              if (bonus > 0) await PayrollBonusDeduction.create({ organizationId: ORG_ID, branchId: 1, payrollId: rec.id, type: "bonus", amount: bonus, reason: "Bonus", date: `${2026}-${String(month).padStart(2, "0")}-01` });
              if (deduction > 0) await PayrollBonusDeduction.create({ organizationId: ORG_ID, branchId: 1, payrollId: rec.id, type: "deduction", amount: deduction, reason: "Deduction", date: `${2026}-${String(month).padStart(2, "0")}-01` });
            }
          } catch (e) { /* ignore */ }
        }
      }
      console.log(`Payrolls: +${c}`);
    }

    // ===== 27. EXPENSES (need 50 total, current ~30) =====
    const expCount = await Expense.count({ where: { organizationId: ORG_ID } });
    const expNeeded = Math.max(0, TARGET - expCount);
    if (expNeeded > 0) {
      for (let i = 0; i < expNeeded; i++) {
        const cat = allExpenseCats[i % allExpenseCats.length];
        const amt = Math.floor(Math.random() * 30000) + 500;
        try {
          await Expense.findOrCreate({
            where: { referenceNo: `EXP-BAT-${i + expCount + 1}`, organizationId: ORG_ID },
            defaults: {
              organizationId: ORG_ID, branchId: 1, categoryId: cat.id,
              referenceNo: `EXP-BAT-${i + expCount + 1}`,
              amount: amt, date: new Date().toISOString().split("T")[0],
              expenseFor: `Expense ${i + expCount + 1}`,
              description: `Auto-generated expense`, paymentMethod: "cash",
            }
          });
        } catch (e) { /* ignore */ }
      }
      console.log(`Expenses: +${expNeeded}`);
    }

    // ===== 28. BANK TRANSACTIONS (already 74, need 50 so fine) =====

    // ===== 29. SUPPLIER TRANSACTIONS (already 50, fine) =====

    // ===== 30. ATTENDANCES (already 433, fine) =====

    // ===== 31. STAFF LOGS (need 50 total, current ~47) =====
    const slCount = await StaffLog.count({ where: { organizationId: ORG_ID } });
    const slNeeded = Math.max(0, TARGET - slCount);
    if (slNeeded > 0) {
      const salesArr = await Sale.findAll({ where: { organizationId: ORG_ID } });
      let c = 0;
      for (const staff of allStaff) {
        if (c >= slNeeded) break;
        for (let j = 0; j < 2; j++) {
          if (c >= slNeeded) break;
          const sale = salesArr[Math.floor(Math.random() * salesArr.length)];
          const price = Math.floor(Math.random() * 3000) + 200;
          try {
            await StaffLog.create({
              organizationId: ORG_ID, branchId: 1,
              staffId: staff.id, saleId: sale?.id || null,
              actionType: "Commission", itemName: "Service",
              price, commissionRate: "10%", amountEarned: price * 0.1,
            });
            c++;
          } catch (e) { /* ignore */ }
        }
      }
      console.log(`Staff Logs: +${c}`);
    }

    // ===== 32. PRODUCT VARIATIONS (need 50 total, current ~3) =====
    const pvCount = await ProductVariation.count();
    const pvNeeded = Math.max(0, TARGET - pvCount);
    if (pvNeeded > 0) {
      const allProds = await Product.findAll({ where: { organizationId: ORG_ID, productType: "variable" } });
      const allVars = await Variation.findAll({ where: { organizationId: ORG_ID } });
      let c = 0;
      for (const prod of allProds) {
        if (c >= pvNeeded) break;
        for (const v of allVars) {
          if (c >= pvNeeded) break;
          try {
            await ProductVariation.findOrCreate({
              where: { productId: prod.id, name: v.name },
              defaults: { productId: prod.id, name: v.name, sku: `VAR-${prod.id}-${c}`, sellingPriceExc: Math.floor(Math.random() * 2000) + 100, currentStock: Math.floor(Math.random() * 50) }
            });
            c++;
          } catch (e) { /* ignore */ }
        }
      }
      // If not enough variable products, use any product
      if (c < pvNeeded) {
        for (const prod of allProds) {
          if (c >= pvNeeded) break;
          try {
            await ProductVariation.findOrCreate({
              where: { productId: prod.id, name: `Var ${c}` },
              defaults: { productId: prod.id, name: `Var ${c}`, sku: `VAR-${prod.id}-${c}`, sellingPriceExc: Math.floor(Math.random() * 2000) + 100, currentStock: Math.floor(Math.random() * 50) }
            });
            c++;
          } catch (e) { /* ignore */ }
        }
      }
      console.log(`Product Variations: +${c}`);
    }

    // ===== 33. SALE RETURNS (need 50 total, current ~12) + ITEMS + PAYMENTS =====
    const srCount = await SaleReturn.count({ where: { organizationId: ORG_ID } });
    const srNeeded = Math.max(0, TARGET - srCount);
    if (srNeeded > 0) {
      const salesArr = await Sale.findAll({ where: { organizationId: ORG_ID } });
      for (let i = 0; i < srNeeded; i++) {
        const sale = salesArr[Math.floor(Math.random() * salesArr.length)];
        if (!sale) continue;
        const total = Math.floor(Math.random() * 5000) + 500;
        try {
          const ret = await SaleReturn.create({
            organizationId: ORG_ID, branchId: 1, saleId: sale.id,
            customerId: sale.customerId,
            returnDate: new Date(), subtotal: total,
            total, amountReturned: total,
            status: "paid", invoiceNumber: `SR-BAT-${String(i + srCount + 1).padStart(4, "0")}`,
          });
          const si = await SaleItem.findOne({ where: { saleId: sale.id } });
          if (si) {
            const qty = Math.floor(Math.random() * si.quantity) + 1;
            await SaleReturnItem.create({
              saleReturnId: ret.id, saleItemId: si.id,
              itemId: si.itemId, itemType: si.itemType, itemName: si.itemName,
              price: si.price, quantityReturned: qty,
            });
          }
          await SaleReturnPayment.create({
            saleReturnId: ret.id, amount: total,
            paymentMethod: "Cash", note: "Return payment",
          });
        } catch (e) { /* ignore */ }
      }
      console.log(`Sale Returns + Items + Payments: +${srNeeded}`);
    }

    // ===== 34. PURCHASE RETURNS (need 50 total, current ~3) + ITEMS + PAYMENTS =====
    const prrCount = await PurchaseReturn.count({ where: { organizationId: ORG_ID } });
    const prrNeeded = Math.max(0, TARGET - prrCount);
    if (prrNeeded > 0) {
      const purchArr = await Purchase.findAll({ where: { organizationId: ORG_ID } });
      for (let i = 0; i < prrNeeded; i++) {
        const purch = purchArr[Math.floor(Math.random() * purchArr.length)];
        if (!purch) continue;
        const total = Math.floor(Math.random() * 10000) + 500;
        try {
          const ret = await PurchaseReturn.create({
            organizationId: ORG_ID, branchId: 1, purchaseId: purch.id,
            supplierId: purch.supplierId,
            returnDate: new Date(), subtotal: total, total,
            amountReturned: total, status: "paid",
            invoiceNumber: `PR-BAT-${String(i + prrCount + 1).padStart(4, "0")}`,
          });
          const pi = await PurchaseItem.findOne({ where: { purchaseId: purch.id } });
          if (pi) {
            await PurchaseReturnItem.create({
              purchaseReturnId: ret.id, purchaseItemId: pi.id,
              quantityReturned: Math.floor(Math.random() * 5) + 1,
              amount: total / 2,
            });
          }
          await PurchaseReturnPayment.create({
            purchaseReturnId: ret.id, amount: total,
            paymentMethod: "Bank Transfer", note: "Refund for return",
          });
        } catch (e) { /* ignore */ }
      }
      console.log(`Purchase Returns + Items + Payments: +${prrNeeded}`);
    }

    // ===== 35. EXTRA TABLES =====
    // supplier_purchases (currently 0, need 50)
    try {
      const spCount = await sequelize.query("SELECT COUNT(*) as c FROM supplier_purchases", { type: sequelize.QueryTypes.SELECT });
      const spNeeded = Math.max(0, TARGET - (spCount[0]?.c || 0));
      if (spNeeded > 0) {
        for (let i = 0; i < spNeeded; i++) {
          const sup = allSuppliers[i % allSuppliers.length];
          try {
            await sequelize.query(
              "INSERT INTO supplier_purchases (organization_id, supplier_id, total_amount, payment_status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
              { replacements: [ORG_ID, sup.id, Math.floor(Math.random() * 50000) + 1000, Math.random() > 0.3 ? "paid" : "due"] }
            );
          } catch (e) { /* ignore */ }
        }
        console.log(`Supplier Purchases: +${spNeeded}`);
      }
    } catch (e) { console.log("supplier_purchases table skipped"); }

    // wastages (currently 0, need 50)
    try {
      const wsCount = await sequelize.query("SELECT COUNT(*) as c FROM wastages", { type: sequelize.QueryTypes.SELECT });
      const wsNeeded = Math.max(0, TARGET - (wsCount[0]?.c || 0));
      if (wsNeeded > 0) {
        const allProds = await Product.findAll({ where: { organizationId: ORG_ID } });
        const reasons = ["Damaged","Expired","Spilled","Broken","Contaminated"];
        for (let i = 0; i < wsNeeded; i++) {
          const prod = allProds[i % allProds.length];
          try {
            await sequelize.query(
              "INSERT INTO wastages (organization_id, branch_id, product_id, quantity, reason, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
              { replacements: [ORG_ID, allBranches[i % allBranches.length].id, prod.id, Math.floor(Math.random() * 5) + 1, reasons[i % reasons.length], Math.floor(Math.random() * 5000) + 100] }
            );
          } catch (e) { /* ignore */ }
        }
        console.log(`Wastages: +${wsNeeded}`);
      }
    } catch (e) { console.log("wastages table skipped"); }

    // inventory (currently 4, need 50)
    try {
      const invCount = await sequelize.query("SELECT COUNT(*) as c FROM inventory", { type: sequelize.QueryTypes.SELECT });
      const invNeeded = Math.max(0, TARGET - (invCount[0]?.c || 0));
      if (invNeeded > 0) {
        const allProds = await Product.findAll({ where: { organizationId: ORG_ID } });
        for (let i = 0; i < invNeeded; i++) {
          const prod = allProds[i % allProds.length];
          try {
            await sequelize.query(
              "INSERT INTO inventory (organization_id, branch_id, product_id, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
              { replacements: [ORG_ID, allBranches[i % allBranches.length].id, prod.id, Math.floor(Math.random() * 50) + 10] }
            );
          } catch (e) { /* ignore */ }
        }
        console.log(`Inventory: +${invNeeded}`);
      }
    } catch (e) { console.log("inventory table skipped"); }

    console.log("\n=== BATCH SEED COMPLETED ===");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
