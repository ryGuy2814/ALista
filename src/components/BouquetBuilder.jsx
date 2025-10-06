import React, { useMemo } from 'react';
import { Plus, Minus, X } from 'lucide-react';

import roseImg from '../assets/rose.jpg';
import peonyImg from '../assets/peony.jpg';
import tulipImg from '../assets/tulip.jpg';
import dahliaImg from '../assets/dahlia.jpg';
import eucalyptusImg from '../assets/eucalyptus.jpg';
import lilyImg from '../assets/lily.jpg';

const flowerMarket = [
    { id: 'rose', name: 'Rose', price: 3.50, imageUrl: roseImg },
    { id: 'peony', name: 'Peony', price: 6.00, imageUrl: peonyImg },
    { id: 'tulip', name: 'Tulip', price: 2.75, imageUrl: tulipImg },
    { id: 'dahlia', name: 'Dahlia', price: 4.50, imageUrl: dahliaImg },
    { id: 'eucalyptus', name: 'Eucalyptus', price: 1.50, imageUrl: eucalyptusImg },
    { id: 'lily', name: 'Lily', price: 5.50, imageUrl: lilyImg },
];

const BouquetBuilder = ({ florals, onUpdate }) => {
    const bouquet = florals?.bouquet || [];

    const handleAddFlower = (flower) => {
        const existingFlower = bouquet.find(item => item.id === flower.id);
        let newBouquet;
        if (existingFlower) {
            newBouquet = bouquet.map(item => 
                item.id === flower.id ? { ...item, quantity: item.quantity + 1 } : item
            );
        } else {
            newBouquet = [...bouquet, { ...flower, quantity: 1 }];
        }
        onUpdate({ ...florals, bouquet: newBouquet });
    };

    const handleRemoveFlower = (flowerId) => {
        const existingFlower = bouquet.find(item => item.id === flowerId);
        let newBouquet;
        if (existingFlower && existingFlower.quantity > 1) {
            newBouquet = bouquet.map(item => 
                item.id === flowerId ? { ...item, quantity: item.quantity - 1 } : item
            );
        } else {
            newBouquet = bouquet.filter(item => item.id !== flowerId);
        }
        onUpdate({ ...florals, bouquet: newBouquet });
    };

    const totalCost = useMemo(() => {
        return bouquet.reduce((total, item) => total + (item.price * item.quantity), 0);
    }, [bouquet]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* Flower Market */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-4">Flower Market</h1>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {flowerMarket.map(flower => (
                        <div key={flower.id} className="relative border dark:border-gray-700 rounded-lg overflow-hidden group">
                            <img src={flower.imageUrl} alt={flower.name} className="w-full h-32 object-cover" />
                            <div className="p-2">
                                {/* UPDATED: Made the flower name text higher contrast. */}
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{flower.name}</p>
                                {/* UPDATED: Made the price text higher contrast. */}
                                <p className="text-sm text-gray-600 dark:text-gray-300">${flower.price.toFixed(2)} / stem</p>
                            </div>
                            <button onClick={() => handleAddFlower(flower)} className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all">
                                <Plus className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transform group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Your Bouquet */}
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-4">Your Bouquet</h1>
                <div className="space-y-3 mb-6">
                    {bouquet.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                            <div className="flex items-center">
                                <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover mr-3"/>
                                <div>
                                    {/* UPDATED: Made the flower name text higher contrast. */}
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{item.name}</p>
                                    {/* UPDATED: Made the price text higher contrast. */}
                                    <p className="text-sm text-gray-600 dark:text-gray-300">${item.price.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleRemoveFlower(item.id)} className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300"><Minus size={14}/></button>
                                <span className="font-bold text-lg w-4 text-center">{item.quantity}</span>
                                <button onClick={() => handleAddFlower(item)} className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300"><Plus size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="border-t dark:border-gray-600 pt-4">
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span>Total Est. Cost:</span>
                        <span>${totalCost.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BouquetBuilder;