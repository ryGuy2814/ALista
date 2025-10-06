import React, { useState, useEffect, useMemo } from 'react';
import { Wand2, Heart, Check, Trash2, Palette } from 'lucide-react';
import gardenBackground from '../assets/gardenBackground.png';
import churchBackground from '../assets/churchBackground.png';

const WeddingSimulator = ({ dream, onUpdate, onComplete }) => {
    const [currentDream, setCurrentDream] = useState(dream);
    const [isGeneratingPalette, setIsGeneratingPalette] = useState(false);

    useEffect(() => {
        setCurrentDream(dream);
    }, [dream]);
    
    const defaultStyles = {
        brideNeckline: 'Sweetheart',
        brideHasVeil: false,
        bridesmaidColor: '#92A8D1',
        bridesmaidDressLength: 'long',
        groomSuit: '#374151',
        groomAccessory: 'necktie',
        groomShoeColor: '#5d4037',
        backgroundScene: '',
    };
    
    const dreamWithDefaults = useMemo(() => ({
        theme: currentDream?.theme || 'Modern Romantic',
        palette: currentDream?.palette || ['#F7CAC9', '#E2E8F0', '#94A3B8', '#475569', '#1E293B'],
        budget: currentDream?.budget ?? 25000,
        styles: { ...defaultStyles, ...(currentDream?.styles || {}) },
        savedPalettes: currentDream?.savedPalettes || []
    }), [currentDream]);

    const themes = [
        { name: 'Modern Romantic', icon: '💖', color: '#F7CAC9' },
        { name: 'Rustic Bohemian', icon: '🌿', color: '#B2AC88' },
        { name: 'Classic Elegance', icon: '💎', color: '#92A8D1' },
        { name: 'Tropical Getaway', icon: '🌴', color: '#FF8C69' },
    ];
    const suitColors = { Navy: '#1e3a8a', Charcoal: '#374151', Black: '#111827', Tan: '#d2b48c' };
    const necklines = ['Sweetheart', 'V-Neck', 'Strapless'];
    const shoeColors = { Brown: '#5d4037', Black: '#000000' };
    const costData = { themes: { 'Modern Romantic': 15000, 'Rustic Bohemian': 12000, 'Classic Elegance': 20000, 'Tropical Getaway': 25000 } };
    
    const backgrounds = {
        'Beach': 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80',
        'Garden': gardenBackground,
        'Church': churchBackground,
        'None': '',
    };
    
    const dynamicSuitColors = useMemo(() => {
        const availableColors = new Map(Object.entries(suitColors).map(([name, color]) => [color, name]));
        if (dreamWithDefaults.palette && dreamWithDefaults.palette.length > 1) {
            dreamWithDefaults.palette.slice(1).forEach((color, index) => {
                if (!availableColors.has(color)) {
                    availableColors.set(color, `Theme Color ${index + 1}`);
                }
            });
        }
        return Array.from(availableColors, ([color, name]) => ({ name, color }));
    }, [dreamWithDefaults.palette]);
    
    const estimatedDreamCost = useMemo(() => {
        const themeCost = costData.themes[dreamWithDefaults.theme] || 15000;
        const dressCost = 2500;
        return themeCost + dressCost;
    }, [dreamWithDefaults.theme]);

    const handleUpdate = (newDreamState) => { 
        setCurrentDream(newDreamState); 
        onUpdate(newDreamState, 'simulator'); 
    };

    const handleStyleUpdate = (styleField, value) => {
        const newStyles = { ...dreamWithDefaults.styles, [styleField]: value };
        handleUpdate({ ...dreamWithDefaults, styles: newStyles });
    };

    const handleBaseColorChange = (newColor) => {
        const newPalette = [newColor, ...dreamWithDefaults.palette.slice(1)];
        handleUpdate({ ...dreamWithDefaults, palette: newPalette });
    };

    const handleGeneratePalette = async () => {
        const baseColor = dreamWithDefaults.palette[0];
        const currentThemeName = dreamWithDefaults.theme;
        
        if (!currentThemeName || !baseColor) {
            console.error("Theme or base color is not defined.");
            return;
        }

        setIsGeneratingPalette(true);
        const prompt = `You are an expert wedding color palette designer. Based on the primary color "${baseColor}" for a "${currentThemeName}" themed wedding, generate a complementary FIVE-COLOR palette. The palette should consist of: the primary base color, a secondary color, two different accent colors, and one neutral color. Return the response as a valid JSON object with a single key "palette", which is an array of EXACTLY 5 hex color code strings. The first color in the array must be the provided base color. IMPORTANT: Your entire response must be only the raw JSON text. Do not include any introductory phrases or markdown.`;
        const payload = { prompt };

        try {
            const response = await fetch('/.netlify/functions/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);
            
            const result = await response.json();
            const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) throw new Error("AI returned an empty response.");

            const startIndex = rawText.indexOf('{');
            const endIndex = rawText.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) throw new Error("Valid JSON object not found in response.");
            
            const jsonString = rawText.substring(startIndex, endIndex + 1);
            const newPalette = JSON.parse(jsonString).palette;
            
            if (Array.isArray(newPalette) && newPalette.length > 0) {
                const finalUpdate = { ...dreamWithDefaults, palette: newPalette, styles: { ...dreamWithDefaults.styles, bridesmaidColor: newPalette[1] || dreamWithDefaults.styles.bridesmaidColor, groomSuit: newPalette[4] || dreamWithDefaults.styles.groomSuit }};
                handleUpdate(finalUpdate);
            } else { 
                throw new Error("Parsed data did not contain a valid palette.");
            }
        } catch (error) {
            console.error("Error generating palette:", error);
            const fallbackPalette = [baseColor, '#e2e8f0', '#94a3b8', '#475569', '#1e293b'];
            handleUpdate({ ...dreamWithDefaults, palette: fallbackPalette });
        } finally {
            setIsGeneratingPalette(false);
        }
    };

    const handleThemeSelect = (selectedTheme) => { 
        const newPalette = [selectedTheme.color, ...dreamWithDefaults.palette.slice(1)];
        handleUpdate({ ...dreamWithDefaults, theme: selectedTheme.name, palette: newPalette });
    };

    // UPDATED: Now saves a palette OBJECT, not just an array.
    const handleSavePalette = () => {
        const currentPalettes = dreamWithDefaults.savedPalettes || [];
        const isSaved = currentPalettes.some(p => JSON.stringify(p.colors) === JSON.stringify(dreamWithDefaults.palette));
        if (!isSaved) {
            const newSavedPalette = {
                id: new Date().getTime(), // Add a unique ID for React keys
                colors: dreamWithDefaults.palette
            };
            const updatedPalettes = [...currentPalettes, newSavedPalette];
            handleUpdate({ ...dreamWithDefaults, savedPalettes: updatedPalettes });
        }
    };
    
    // UPDATED: Applies the `colors` array from the saved palette object.
    const handleApplyPalette = (paletteToApply) => {
        const colors = paletteToApply.colors;
        const newStyles = { ...dreamWithDefaults.styles, bridesmaidColor: colors[1] || dreamWithDefaults.styles.bridesmaidColor, groomSuit: colors[4] || dreamWithDefaults.styles.groomSuit, }; 
        handleUpdate({ ...dreamWithDefaults, palette: colors, styles: newStyles }); 
    };
    
    // UPDATED: Deletes a palette object by its unique `id`.
    const handleDeletePalette = (paletteToDelete) => {
        const currentPalettes = dreamWithDefaults.savedPalettes || [];
        const updatedPalettes = currentPalettes.filter(p => p.id !== paletteToDelete.id);
        handleUpdate({ ...dreamWithDefaults, savedPalettes: updatedPalettes });
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md">
                <div className="flex items-center">
                    <Wand2 size={28} className="text-purple-500" />
                    <h1 className="ml-3 text-2xl font-bold">Dream Wedding Simulator</h1>
                </div>
                <button onClick={() => onComplete(dreamWithDefaults)} className="bg-pink-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-pink-600 transition-colors">
                    Let's Start Planning!
                </button>
            </header>
            <main className="flex-1 p-6 md:p-10 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">1. Choose Your Theme</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {themes.map(themeOption => (
                                <button key={themeOption.name} onClick={() => handleThemeSelect(themeOption)} className={`relative p-4 border-2 rounded-lg text-center transition-colors ${dreamWithDefaults.theme === themeOption.name ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                    <span className="text-3xl">{themeOption.icon}</span>
                                    <p className="font-semibold mt-2">{themeOption.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">2. Pick a Primary Color</h2>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                               <input type="color" value={dreamWithDefaults.palette[0] || '#ffffff'} onInput={(e) => handleBaseColorChange(e.target.value)} className="w-16 h-16 p-0 border-none rounded-lg cursor-pointer"/>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Choose a base color, then generate a palette.</p>
                            </div>
                            <button onClick={handleGeneratePalette} disabled={isGeneratingPalette} className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors disabled:bg-purple-300">
                                {isGeneratingPalette ? (
                                    <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Generating...</span></>
                                ) : (
                                    <><Palette size={20} /><span>Generate Palette</span></>
                                )}
                            </button>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-2">3. Set a Dream Budget</h2>
                          <div className="flex items-center mt-4">
                            <span className="text-3xl font-bold mr-2 text-gray-400">$</span>
                            <input type="number" value={dreamWithDefaults.budget} onChange={e => handleUpdate({ ...dreamWithDefaults, budget: parseInt(e.target.value, 10) || 0 })} className="w-full text-3xl font-bold p-2 border-0 bg-transparent focus:ring-0" step="1000" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">4. Choose a Scene</h2>
                        <div className="grid grid-cols-2 gap-2">
                           {Object.entries(backgrounds).map(([name, url]) => (
                                <button key={name} onClick={() => handleStyleUpdate('backgroundScene', url)} className={`relative border-2 rounded-lg overflow-hidden aspect-video ${dreamWithDefaults.styles.backgroundScene === url ? 'border-purple-500 ring-2 ring-purple-500' : 'border-transparent'}`}>
                                    {url ? ( <img src={url} alt={name} className="w-full h-full object-cover" /> ) : ( <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500">None</div> )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                                    <p className="text-xs font-semibold p-1 text-white absolute bottom-1 left-2">{name}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Saved Color Schemes</h2>
                        {/* UPDATED: Maps over the new array of objects. */}
                        <div className="max-h-48 overflow-y-auto pr-2 space-y-3">{dreamWithDefaults.savedPalettes.length === 0 ? (<p className="text-gray-500 dark:text-gray-400 text-sm">Your saved palettes will appear here.</p>) : (dreamWithDefaults.savedPalettes.map((savedPalette) => (<div key={savedPalette.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"><div className="flex items-center space-x-2">{savedPalette.colors.map((color, cIndex) => (<div key={cIndex} className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600" style={{ backgroundColor: color }}></div>))}</div><div className="flex items-center space-x-2"><button onClick={() => handleApplyPalette(savedPalette)} title="Apply Palette" className="p-1 text-green-600 hover:text-green-500"><Check size={18} /></button><button onClick={() => handleDeletePalette(savedPalette)} title="Delete Palette" className="p-1 text-red-600 hover:text-red-500"><Trash2 size={18} /></button></div></div>)))}</div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-6 border-b pb-4 dark:border-gray-600">Your Dream Wedding Vision</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><p className="text-sm font-medium text-gray-500">THEME</p><p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">{dreamWithDefaults.theme}</p></div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">COLOR PALETTE</p>
                                <div className="flex items-center space-x-3 mt-2">
                                    {dreamWithDefaults.palette.map((color, index) => (<div key={index} className="w-12 h-12 rounded-lg shadow-inner border dark:border-gray-700" style={{ backgroundColor: color }}></div>))}
                                    <button onClick={handleSavePalette} title="Save Palette" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-pink-500 hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors"><Heart size={24} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Budget Forecaster</h2>
                        <div className="flex justify-between items-center text-lg"><div className="text-gray-500">Your Budget: <span className="font-bold text-gray-800 dark:text-white">${dreamWithDefaults.budget.toLocaleString()}</span></div><div className="text-gray-500">Estimated Cost: <span className="font-bold text-green-500">${estimatedDreamCost.toLocaleString()}</span></div></div>
                        <BudgetGauge currentValue={estimatedDreamCost} maxValue={dreamWithDefaults.budget} />
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-6 border-b pb-4 dark:border-gray-600">Virtual Wedding Party Stylist</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-600 dark:text-gray-300">Bride</h3>
                                <div><label className="block text-sm font-medium text-gray-500 mb-2">Neckline</label><select value={dreamWithDefaults.styles.brideNeckline} onChange={e => handleStyleUpdate('brideNeckline', e.target.value)} className="w-full p-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:ring-purple-500 focus:border-purple-500">{necklines.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                                <div className="flex items-center"><input type="checkbox" id="hasVeil" checked={dreamWithDefaults.styles.brideHasVeil} onChange={e => handleStyleUpdate('brideHasVeil', e.target.checked)} className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" /><label htmlFor="hasVeil" className="ml-2 block text-sm">Add Veil</label></div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-600 dark:text-gray-300">Groom</h3>
                                <div><label className="block text-sm font-medium text-gray-500 mb-2">Suit Color</label><div className="flex space-x-2 flex-wrap gap-y-2">{dynamicSuitColors.map(({ name, color }) => (<button key={color} title={name} onClick={() => handleStyleUpdate('groomSuit', color)} className={`w-8 h-8 rounded-full border-2 ${dreamWithDefaults.styles.groomSuit === color ? 'border-purple-500 ring-2 ring-purple-500' : 'border-transparent'}`} style={{backgroundColor: color}}></button>))}</div></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-2">Accessory</label><div className="flex space-x-2"><button onClick={() => handleStyleUpdate('groomAccessory', 'necktie')} className={`px-3 py-1 text-sm rounded-full ${dreamWithDefaults.styles.groomAccessory === 'necktie' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Tie</button><button onClick={() => handleStyleUpdate('groomAccessory', 'bowtie')} className={`px-3 py-1 text-sm rounded-full ${dreamWithDefaults.styles.groomAccessory === 'bowtie' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Bowtie</button></div></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-2">Shoes</label><div className="flex space-x-2">{Object.entries(shoeColors).map(([name, color]) => (<button key={name} title={name} onClick={() => handleStyleUpdate('groomShoeColor', color)} className={`w-8 h-8 rounded-full border-2 ${dreamWithDefaults.styles.groomShoeColor === color ? 'border-purple-500 ring-2 ring-purple-500' : 'border-transparent'}`} style={{backgroundColor: color}}></button>))}</div></div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-600 dark:text-gray-300">Bridesmaids</h3>
                                <div><label className="block text-sm font-medium text-gray-500 mb-2">Dress Color</label><div className="flex space-x-2">{dreamWithDefaults.palette.map((c, i) => ( <button key={i} onClick={() => handleStyleUpdate('bridesmaidColor', c)} className={`w-8 h-8 rounded-full border-2 ${dreamWithDefaults.styles.bridesmaidColor === c ? 'border-purple-500 ring-2 ring-purple-500' : 'border-transparent'}`} style={{backgroundColor: c}}></button>))}</div></div>
                                <div><label className="block text-sm font-medium text-gray-500 mb-2">Dress Length</label><div className="flex space-x-2"><button onClick={() => handleStyleUpdate('bridesmaidDressLength', 'long')} className={`px-3 py-1 text-sm rounded-full ${dreamWithDefaults.styles.bridesmaidDressLength === 'long' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Long</button><button onClick={() => handleStyleUpdate('bridesmaidDressLength', 'short')} className={`px-3 py-1 text-sm rounded-full ${dreamWithDefaults.styles.bridesmaidDressLength === 'short' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Short</button></div></div>
                            </div>
                        </div>
                        <div className="relative p-6 rounded-lg flex justify-center items-end space-x-4 h-64 bg-cover bg-center transition-all duration-500" style={{ backgroundImage: `url(${dreamWithDefaults.styles.backgroundScene})` }}>
                            {!dreamWithDefaults.styles.backgroundScene && <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700/50 rounded-lg"></div>}
                            <div className="relative z-10 flex justify-center items-end space-x-4">
                                <BridesmaidIcon dressColor={dreamWithDefaults.styles.bridesmaidColor} dressLength={dreamWithDefaults.styles.bridesmaidDressLength} />
                                <BrideIcon dressStyle={dreamWithDefaults.styles.brideNeckline} hasVeil={dreamWithDefaults.styles.brideHasVeil} />
                                <GroomIcon suitColor={dreamWithDefaults.styles.groomSuit} accessory={dreamWithDefaults.styles.groomAccessory} shoeColor={dreamWithDefaults.styles.groomShoeColor} />
                                <BridesmaidIcon dressColor={dreamWithDefaults.styles.bridesmaidColor} dressLength={dreamWithDefaults.styles.bridesmaidDressLength} />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- HELPER & SVG COMPONENTS ---
const BudgetGauge = ({ currentValue, maxValue }) => { const percentage = maxValue > 0 ? Math.min((currentValue / maxValue) * 100, 100) : 0; let barColor = 'bg-green-500'; if (percentage > 75) barColor = 'bg-yellow-500'; if (percentage > 95) barColor = 'bg-red-500'; return ( <div className="mt-4"> <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4"> <div className={`${barColor} h-4 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div> </div> </div> ); };
const BrideIcon = ({ dressStyle, hasVeil }) => ( <div className="flex flex-col items-center"> <svg width="70" height="192" viewBox="0 0 70 192" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform scale-110"> {hasVeil && <path d="M18 17C18 7.61116 25.6112 0 35 0C44.3888 0 52 7.61116 52 17V80L35 90L18 80V17Z" fill="rgba(255, 255, 255, 0.5)" />} <path d="M35 0C44.3888 0 52 7.61116 52 17C52 26.3888 44.3888 34 35 34C25.6112 34 18 26.3888 18 17C18 7.61116 25.6112 0 35 0Z" fill="#e0ac93"/> <path d="M12 42H58L70 192H0L12 42Z" fill="white"/> {dressStyle === 'V-Neck' && <path d="M35 42L22 62H48L35 42Z" fill="#e0ac93" />} {dressStyle === 'Sweetheart' && <path d="M35 42C30 42 25 48 25 52C25 56 30 54 35 50C40 54 45 56 45 52C45 48 40 42 35 42Z" fill="#e0ac93" />} {dressStyle === 'Strapless' && <path d="M22 42H48V50H22V42Z" fill="#e0ac93" />} </svg> <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Bride ({dressStyle})</p> </div> );
const GroomIcon = ({ suitColor, accessory, shoeColor }) => ( <div className="flex flex-col items-center"> <svg width="64" height="184" viewBox="0 0 64 184" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M32 0C40.8366 0 48 7.16344 48 16C48 24.8366 40.8366 32 32 32C23.1634 32 16 24.8366 16 16C16 7.16344 23.1634 0 32 0Z" fill="#e0ac93"/> <rect x="4" y="174" width="22" height="10" rx="5" fill={shoeColor} /> <rect x="38" y="174" width="22" height="10" rx="5" fill={shoeColor} /> <path d="M12 40H52L60 104L32 176L4 104L12 40Z" fill={suitColor}/> <path d="M12 40L32 64L52 40L32 48L12 40Z" fill="white"/> {accessory === 'necktie' && <path d="M32 64L28 104H36L32 64Z" fill={suitColor === '#111827' ? '#6b7280' : '#111827'}/>} {accessory === 'bowtie' && <path d="M24 62L32 68L40 62L40 74L32 68L24 74L24 62Z" fill={suitColor === '#111827' ? '#6b7280' : '#111827'} />} </svg> <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Groom</p> </div> );
const BridesmaidIcon = ({ dressColor, dressLength }) => ( <div className="flex flex-col items-center"> <svg width="56" height="160" viewBox="0 0 56 160" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M28 0C35.732 0 42 6.26801 42 14C42 21.732 35.732 28 28 28C20.268 28 14 21.732 14 14C14 6.26801 20.268 0 28 0Z" fill="#e0ac93"/> <path d={dressLength === 'short' ? "M10 36H46L52 100H4L10 36Z" : "M10 36H46L56 160H0L10 36Z"} fill={dressColor} /> {dressLength === 'short' && ( <> <rect x="16" y="100" width="8" height="50" fill="#e0ac93" /> <rect x="32" y="100" width="8" height="50" fill="#e0ac93" /> </> )} </svg> <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Bridesmaid</p> </div> );

export default WeddingSimulator;