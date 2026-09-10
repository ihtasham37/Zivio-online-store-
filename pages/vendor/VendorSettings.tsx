
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../hooks/useStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Icons } from '../../components/icons/Icons';
import { Spinner } from '../../components/ui/Spinner';

const VendorSettings = () => {
    const { userData, updateVendorProfile } = useAuth();
    const [shopName, setShopName] = useState(userData?.shopName || '');
    const [whatsappNumber, setWhatsappNumber] = useState(userData?.whatsappNumber || '');
    const [shopLogoUrl, setShopLogoUrl] = useState(userData?.shopLogoUrl || '');
    const [shopBannerUrl, setShopBannerUrl] = useState(userData?.shopBannerUrl || '');
    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const { uploadFile } = useStore();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsLoading(true);
        try {
            const url = await uploadFile(file);
            if (field === 'logo') setShopLogoUrl(url);
            else setShopBannerUrl(url);
        } catch (err) {
            alert('Upload failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userData) return;
        
        setIsLoading(true);
        setSuccessMsg('');
        try {
            await updateVendorProfile(userData.uid, {
                shopName,
                whatsappNumber,
                shopLogoUrl,
                shopBannerUrl
            });
            setSuccessMsg('Profile updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            alert('Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Shop Settings</h1>
            
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <Input 
                            label="Shop Display Name" 
                            value={shopName} 
                            onChange={e => setShopName(e.target.value)} 
                            placeholder="e.g. Ali's Collection"
                            required
                        />
                        <p className="text-xs text-gray-500 -mt-2">This name will be visible to all customers on your products.</p>
                        
                        <Input 
                            label="WhatsApp Number (for Orders)" 
                            value={whatsappNumber} 
                            onChange={e => setWhatsappNumber(e.target.value)} 
                            placeholder="923000000000"
                            required
                        />
                        <p className="text-xs text-gray-500 -mt-2">Customers will contact this number directly for inquiries.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-800">Shop Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-lg bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                                        {shopLogoUrl ? <img src={shopLogoUrl} className="w-full h-full object-cover" /> : <Icons.image className="w-6 h-6 text-gray-300" />}
                                    </div>
                                    <div className="flex-grow space-y-2">
                                        <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'logo')} className="text-xs" />
                                        <Input value={shopLogoUrl} onChange={e => setShopLogoUrl(e.target.value)} placeholder="Or paste logo URL" className="py-1 text-xs" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-800">Shop Banner</label>
                                <div className="space-y-2">
                                    <div className="h-16 w-full rounded-lg bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                                        {shopBannerUrl ? <img src={shopBannerUrl} className="w-full h-full object-cover" /> : <Icons.image className="w-6 h-6 text-gray-300" />}
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'banner')} className="text-xs flex-grow" />
                                    </div>
                                    <Input value={shopBannerUrl} onChange={e => setShopBannerUrl(e.target.value)} placeholder="Or paste banner URL" className="py-1 text-xs" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {successMsg && (
                        <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center gap-2 border border-green-100 animate-fade-in">
                            <Icons.checkCircle className="w-5 h-5" />
                            {successMsg}
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white border-none py-3 rounded-xl shadow-md shadow-rose-200" 
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="sm" /> : 'Save Changes'}
                    </Button>
                </form>
            </div>

            <div className="mt-8 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2 font-serif">
                    <Icons.alertCircle className="w-5 h-5 text-rose-600" />
                    Business Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-100">
                        <span className="text-gray-500 block">Account Email</span>
                        <span className="font-medium">{userData?.email}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-100">
                        <span className="text-gray-500 block">Business Owner</span>
                        <span className="font-medium">{userData?.firstName} {userData?.lastName}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorSettings;
