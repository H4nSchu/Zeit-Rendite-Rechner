const { useState, useEffect, useMemo } = React;
const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } = window.Recharts;

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block ml-1 text-gray-400 hover:text-gray-200 transition-colors">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const NumberAnimation = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const duration = 500; // ms
    const frames = 30;
    const step = (value - displayValue) / frames;
    let currentFrame = 0;
    
    const interval = setInterval(() => {
      currentFrame++;
      setDisplayValue(prev => {
        const next = prev + step;
        return currentFrame === frames ? value : next;
      });
      if (currentFrame === frames) clearInterval(interval);
    }, duration / frames);
    
    return () => clearInterval(interval);
  }, [value]);

  return <span>{Math.round(displayValue)}</span>;
};

const App = () => {
  const [startKapital, setStartKapital] = useState(65000);
  const [sparrate, setSparrate] = useState(1000);
  const [rendite, setRendite] = useState(3.5);
  const [stundenlohn, setStundenlohn] = useState(20);
  const [wochen, setWochen] = useState(44);
  const [steuern, setSteuern] = useState(false);

  // Calculation helpers
  const calculateInterest = (kapital, r, t) => {
    let interest = kapital * (r / 100);
    if (t) {
      let taxable = Math.max(0, interest - 1000);
      interest -= taxable * 0.26375;
    }
    return interest;
  };

  const getWeeklyTime = (interest, stdLohn, w) => {
    if (stdLohn <= 0 || w <= 0) return 0;
    return (interest / stdLohn) / w;
  };

  const decimalToTime = (decimalHours) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.floor((decimalHours - hours) * 60);
    const seconds = Math.floor((((decimalHours - hours) * 60) - minutes) * 60);
    return { hours, minutes, seconds };
  };

  // Metrics
  const currentInterest = calculateInterest(startKapital, rendite, steuern);
  const currentDecimalTime = getWeeklyTime(currentInterest, stundenlohn, wochen);
  const currentFormattedTime = decimalToTime(currentDecimalTime);

  // Month Delta Calculation
  const nextMonthKapital = startKapital + (startKapital * (rendite / 100 / 12)) + sparrate;
  const nextMonthInterest = calculateInterest(nextMonthKapital, rendite, steuern);
  const nextMonthDecimalTime = getWeeklyTime(nextMonthInterest, stundenlohn, wochen);
  const deltaDecimalTime = nextMonthDecimalTime - currentDecimalTime;
  const deltaFormattedTime = decimalToTime(deltaDecimalTime);

  // Chart Data & Milestone
  const chartData = useMemo(() => {
    const data = [];
    let currentBasis = startKapital;
    let currentSpar = 0;
    
    for (let year = 1; year <= 15; year++) {
      for (let m = 0; m < 12; m++) {
        currentBasis += currentBasis * (rendite / 100 / 12);
        currentSpar += currentSpar * (rendite / 100 / 12) + sparrate;
      }
      
      const nextBasisInt = currentBasis * (rendite / 100);
      const nextSparInt = currentSpar * (rendite / 100);
      const totalInt = nextBasisInt + nextSparInt;
      
      let taxRatio = 0;
      if (steuern && totalInt > 0) {
        const taxes = Math.max(0, totalInt - 1000) * 0.26375;
        taxRatio = taxes / totalInt;
      }
      
      const netBasisInt = nextBasisInt * (1 - taxRatio);
      const netSparInt = nextSparInt * (1 - taxRatio);
      
      const basisHours = getWeeklyTime(netBasisInt, stundenlohn, wochen);
      const sparHours = getWeeklyTime(netSparInt, stundenlohn, wochen);
      
      // Calculate monthly boost for this specific year (simulate 1 month forward)
      const kapBefore = currentBasis + currentSpar;
      const kapAfter = kapBefore + (kapBefore * (rendite / 100 / 12)) + sparrate;
      const intBefore = calculateInterest(kapBefore, rendite, steuern);
      const intAfter = calculateInterest(kapAfter, rendite, steuern);
      const timeBefore = getWeeklyTime(intBefore, stundenlohn, wochen);
      const timeAfter = getWeeklyTime(intAfter, stundenlohn, wochen);
      
      const boostMinutes = (timeAfter - timeBefore) * 60;
      
      data.push({
        name: `Jahr ${year}`,
        Basis: parseFloat(basisHours.toFixed(2)),
        Sparplan: parseFloat(sparHours.toFixed(2)),
        Gesamt: parseFloat((basisHours + sparHours).toFixed(2)),
        ZeitBoost: parseFloat(boostMinutes.toFixed(2))
      });
    }
    return data;
  }, [startKapital, sparrate, rendite, stundenlohn, wochen, steuern]);

  // Find Milestone (8 hours)
  const milestoneYear = chartData.findIndex(d => d.Gesamt >= 8) + 1;

  const CustomTooltipArea = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-xl text-gray-200">
          <p className="font-semibold mb-2">{label}</p>
          <p className="text-emerald-400">Basis: {payload[0]?.value} h/Woche</p>
          <p className="text-emerald-600">Sparplan: {payload[1]?.value} h/Woche</p>
          <p className="text-white font-bold mt-1">Gesamt: {(payload[0]?.value + payload[1]?.value).toFixed(2)} h/Woche</p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipBar = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-xl text-gray-200">
          <p className="font-semibold mb-2">{label}</p>
          <p className="text-neonBlue">Monatl. Zuwachs: {payload[0]?.value} Min/Woche</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-neonBlue">
          Zeit-Rendite-Rechner
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Berechne, wie viel deiner wöchentlichen Arbeitszeit du dir durch passives Einkommen aus Kapital und Sparplänen zurückkaufst.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Input Controls (Left Column) */}
        <div className="lg:col-span-4 bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-700/50 space-y-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Deine Parameter
          </h2>
          
          <div className="space-y-4">
            {/* Startkapital */}
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-300 mb-1 group">
                <span className="cursor-help" title="Dein aktuell investiertes Kapital">Startkapital <InfoIcon /></span>
                <span className="text-emerald-400 font-bold">{startKapital.toLocaleString()} €</span>
              </label>
              <input type="range" min="0" max="500000" step="1000" value={startKapital} onChange={(e) => setStartKapital(Number(e.target.value))} className="w-full accent-emerald-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>

            {/* Sparrate */}
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-300 mb-1 group">
                <span className="cursor-help" title="Wie viel du jeden Monat zusätzlich investierst">Mtl. Sparrate <InfoIcon /></span>
                <span className="text-emerald-400 font-bold">{sparrate.toLocaleString()} €</span>
              </label>
              <input type="range" min="0" max="5000" step="50" value={sparrate} onChange={(e) => setSparrate(Number(e.target.value))} className="w-full accent-emerald-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>

            {/* Rendite */}
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-300 mb-1 group">
                <span className="cursor-help" title="Erwartete Rendite pro Jahr (nach Inflation)">Jahresrendite <InfoIcon /></span>
                <span className="text-emerald-400 font-bold">{rendite.toFixed(1)} %</span>
              </label>
              <input type="range" min="1" max="10" step="0.1" value={rendite} onChange={(e) => setRendite(Number(e.target.value))} className="w-full accent-emerald-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
            </div>

            {/* Stundenlohn */}
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-300 mb-1 group">
                <span className="cursor-help" title="Dein Netto-Stundenlohn nach Steuern">Netto-Stundenlohn <InfoIcon /></span>
              </label>
              <div className="relative">
                <input type="number" min="1" value={stundenlohn} onChange={(e) => setStundenlohn(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                <span className="absolute right-3 top-2 text-gray-400">€</span>
              </div>
            </div>

            {/* Arbeitswochen */}
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-300 mb-1 group">
                <span className="cursor-help" title="Wie viele Wochen du effektiv pro Jahr arbeitest (365 Tage abzüglich Wochenende, Feiertage & Urlaub)">Arbeitswochen/Jahr <InfoIcon /></span>
              </label>
              <input type="number" min="1" max="52" value={wochen} onChange={(e) => setWochen(Number(e.target.value))} className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
            </div>

            {/* Steuern Toggle */}
            <div className="pt-4 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300 cursor-pointer flex items-center" htmlFor="steuernToggle">
                Steuern berücksichtigen
                <span className="ml-1 cursor-help" title="1000€ Freibetrag, danach 26,375% Abgeltungssteuer inkl. Soli"><InfoIcon /></span>
              </label>
              <button 
                id="steuernToggle"
                onClick={() => setSteuern(!steuern)} 
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${steuern ? 'bg-emerald-500' : 'bg-gray-600'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${steuern ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Cards & Charts (Right Column) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Key Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Aktueller Status */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-emerald-500/20 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
              <h3 className="text-sm text-gray-400 font-semibold mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Ersparte Zeit
              </h3>
              <div className="text-2xl font-bold text-white mb-1">
                <NumberAnimation value={currentFormattedTime.hours} /> <span className="text-lg text-emerald-400">h</span>{' '}
                <NumberAnimation value={currentFormattedTime.minutes} /> <span className="text-lg text-emerald-400">m</span>{' '}
                <NumberAnimation value={currentFormattedTime.seconds} /> <span className="text-lg text-emerald-400">s</span>
              </div>
              <p className="text-xs text-gray-500">Dein Startkapital erspart dir aktuell jede Woche diese Arbeitszeit.</p>
            </div>

            {/* Card 2: Monatlicher Effekt */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-neonBlue/20 relative overflow-hidden group hover:border-neonBlue/50 transition-colors">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-neonBlue/10 rounded-full blur-xl group-hover:bg-neonBlue/20 transition-all"></div>
              <h3 className="text-sm text-gray-400 font-semibold mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1 text-neonBlue" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                Zeit-Boost / Monat
              </h3>
              <div className="text-2xl font-bold text-white mb-1">
                +<NumberAnimation value={deltaFormattedTime.minutes} /> <span className="text-lg text-neonBlue">m</span>{' '}
                <NumberAnimation value={deltaFormattedTime.seconds} /> <span className="text-lg text-neonBlue">s</span>
              </div>
              <p className="text-xs text-gray-500">Durch Sparrate & Zinseszins wächst deine Freizeit nächsten Monat hierum.</p>
            </div>

            {/* Card 3: Meilenstein */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-purple-500/20 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all"></div>
              <h3 className="text-sm text-gray-400 font-semibold mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                1 Tag (8h) frei in
              </h3>
              <div className="text-2xl font-bold text-white mb-1">
                {milestoneYear > 0 ? (
                  <><NumberAnimation value={milestoneYear} /> <span className="text-lg text-purple-400">Jahren</span></>
                ) : (
                  <span className="text-purple-400 text-xl">Nie</span>
                )}
              </div>
              <p className="text-xs text-gray-500">Hast du einen ganzen Arbeitstag pro Woche komplett automatisiert.</p>
            </div>
          </div>

          {/* Charts Area */}
          <div className="grid grid-cols-1 gap-8">
            
            {/* Chart 1: Area Chart */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700/50">
              <h3 className="text-lg font-bold text-white mb-6">Dein Zeit-Vermögen über 15 Jahre</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBasis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" tick={{fill: '#9ca3af'}} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af'}} tickLine={false} axisLine={false} unit="h" />
                    <Tooltip content={<CustomTooltipArea />} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="Basis" stackId="1" stroke="#34d399" fill="url(#colorBasis)" />
                    <Area type="monotone" dataKey="Sparplan" stackId="1" stroke="#059669" fill="url(#colorSpar)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Bar Chart */}
            <div className="bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-700/50">
              <h3 className="text-lg font-bold text-white mb-6">Monatlicher Zeit-Boost (Schneeballeffekt)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" tick={{fill: '#9ca3af'}} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" tick={{fill: '#9ca3af'}} tickLine={false} axisLine={false} unit="m" />
                    <Tooltip content={<CustomTooltipBar />} cursor={{fill: '#374151', opacity: 0.4}} />
                    <Bar dataKey="ZeitBoost" fill="#00f3ff" radius={[4, 4, 0, 0]} name="Minuten/Monat Zuwachs" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
