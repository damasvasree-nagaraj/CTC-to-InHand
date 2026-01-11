import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Download } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function App() {
  /* ---------------- UI STATE ---------------- */
  const [darkMode, setDarkMode] = useState(true);

  /* ---------------- FORM STATE ---------------- */
  const [formData, setFormData] = useState({
    ctc: 1200000,
    cityType: 'metro',
    basicPerc: 40,
    hraPerc: 50,
    pfPerc: 12,
    pt: 2500,
    otherDed: 0
  });

  const [result, setResult] = useState(null);

  /* ---------------- TAX CALCULATION ---------------- */
  const calculateTax = (income) => {
    if (income <= 0) return 0;

    const slabs = [
      { limit: 300000, rate: 0 },
      { limit: 700000, rate: 5 },
      { limit: 1000000, rate: 10 },
      { limit: 1200000, rate: 15 },
      { limit: 1500000, rate: 20 },
      { limit: Infinity, rate: 30 }
    ];

    let tax = 0;
    let prev = 0;

    for (const slab of slabs) {
      if (income > prev) {
        const taxable = Math.min(income, slab.limit) - prev;
        tax += taxable * (slab.rate / 100);
        prev = slab.limit;
      }
    }

    // 4% Health & Education Cess
    return Math.round(tax * 1.04);
  };

  /* ---------------- SALARY CALCULATION ---------------- */
  const calculateSalary = () => {
    const { ctc, cityType, basicPerc, hraPerc, pfPerc, pt, otherDed } = formData;

    const basic = (ctc * basicPerc) / 100;
    const employerPf = (basic * pfPerc) / 100;
    const gross = ctc - employerPf;

    const hra =
      cityType === 'metro'
        ? (basic * hraPerc) / 100
        : (basic * 40) / 100;

    const employeePf = (basic * pfPerc) / 100;
    const taxableIncome = gross - hra - 50000;
    const tax = calculateTax(taxableIncome);

    const totalDeductions = employeePf + pt + tax + otherDed;
    const netPay = gross - totalDeductions;

    setResult({
      basic,
      hra,
      employerPf,
      gross,
      employeePf,
      pt,
      tax,
      totalDeductions,
      netPay,
      taxableIncome,
      chartData: [
        { name: 'Net Pay', value: netPay },
        { name: 'Deductions', value: totalDeductions }
      ]
    });
  };

  /* ---------------- PDF EXPORT ---------------- */
  const exportPDF = async () => {
    const element = document.getElementById('result-card');
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);
    pdf.save(`salary-breakdown-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="max-w-6xl mx-auto p-6">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">💼 Advanced Salary Calculator</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded-xl bg-indigo-600 text-white"
          >
            {darkMode ? <Sun /> : <Moon />}
          </button>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow">
            <div className="space-y-4">

              <input
                type="number"
                value={formData.ctc}
                onChange={e => setFormData({ ...formData, ctc: +e.target.value })}
                className="w-full p-3 rounded border"
                placeholder="CTC"
              />

              <select
                value={formData.cityType}
                onChange={e => setFormData({ ...formData, cityType: e.target.value })}
                className="w-full p-3 rounded border"
              >
                <option value="metro">Metro City (50% HRA)</option>
                <option value="non-metro">Non-Metro City (40% HRA)</option>
              </select>

              {[
                ['basicPerc', 'Basic %'],
                ['hraPerc', 'HRA %'],
                ['pfPerc', 'PF %']
              ].map(([key, label]) => (
                <div key={key}>
                  <label>{label}: {formData[key]}%</label>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={formData[key]}
                    onChange={e => setFormData({ ...formData, [key]: +e.target.value })}
                    className="w-full"
                  />
                </div>
              ))}

              <input
                type="number"
                placeholder="Professional Tax"
                value={formData.pt}
                onChange={e => setFormData({ ...formData, pt: +e.target.value })}
                className="w-full p-3 rounded border"
              />

              <input
                type="number"
                placeholder="Other Deductions"
                value={formData.otherDed}
                onChange={e => setFormData({ ...formData, otherDed: +e.target.value })}
                className="w-full p-3 rounded border"
              />

              <button
                onClick={calculateSalary}
                className="w-full bg-indigo-600 text-white p-3 rounded font-bold"
              >
                Calculate Salary
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div id="result-card" className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow">
              <h2 className="text-xl font-bold mb-4">Salary Breakdown</h2>

              <ul className="space-y-2">
                <li>Gross Salary: ₹{result.gross.toLocaleString()}</li>
                <li>Tax: ₹{result.tax.toLocaleString()}</li>
                <li>Total Deductions: ₹{result.totalDeductions.toLocaleString()}</li>
                <li className="font-bold text-green-500">
                  Net Pay: ₹{result.netPay.toLocaleString()}
                </li>
              </ul>

              <PieChart width={250} height={250}>
                <Pie
                  data={result.chartData}
                  dataKey="value"
                  outerRadius={80}
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
              </PieChart>

              <button
                onClick={exportPDF}
                className="mt-4 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
              >
                <Download size={18} /> Export PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
