

import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { Settings as SettingsType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { safeLower } from '../../utils/helpers';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';

const Settings = () => {
    const { settings, updateSettings, isLoading, uploadFile, deleteFile } = useStore();
    const [formData, setFormData] = useState<SettingsType | null>(null);
    const [paymentInput, setPaymentInput] = useState({ id: '', name: '', details: ''});
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingBanner, setIsUploadingBanner] = useState(false);
    const [bannerUploadError, setBannerUploadError] = useState('');
    const [bannerInputMode, setBannerInputMode] = useState<'upload' | 'url'>('upload');
    const [bannerUrl, setBannerUrl] = useState('');
    const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url'>('upload');
    const [storeBannerInputMode, setStoreBannerInputMode] = useState<'upload' | 'url'>('upload');
    
    useEffect(() => {
        if (settings) {
            const settingsCopy: SettingsType = {
                appName: settings.appName || 'Store',
                logoUrl: settings.logoUrl || '',
                storeBannerUrl: settings.storeBannerUrl || '',
                bannerUrls: [...(settings.bannerUrls || [])],
                shippingFee: settings.shippingFee ?? 0,
                whatsappNumber: settings.whatsappNumber || '',
                adminEmail: settings.adminEmail || '',
                paymentMethods: (settings.paymentMethods || []).map(p => ({ ...p })),
                sizeCategories: (settings.sizeCategories || []).map(sc => ({ ...sc, sizes: [...(sc.sizes || [])] })),
                categories: settings.categories || [],
                whatsappGroupUrl: settings.whatsappGroupUrl || '',
                whatsappChannelUrl: settings.whatsappChannelUrl || '',
                telegramChannelUrl: settings.telegramChannelUrl || '',
                youtubeChannelUrl: settings.youtubeChannelUrl || '',
                instagramChannelUrl: settings.instagramChannelUrl || '',
                facebookPageUrl: settings.facebookPageUrl || '',
                showJoinCommunity: settings.showJoinCommunity ?? true,
                showLatestUpdates: settings.showLatestUpdates ?? true,
                showGetApp: settings.showGetApp ?? true,
                showContactWhatsapp: settings.showContactWhatsapp ?? true,
                showContactEmail: settings.showContactEmail ?? true,
                playStoreUrl: settings.playStoreUrl || '',
            };
            setFormData(settingsCopy);
        } else {
            setFormData(null);
        }
    }, [settings]);
    
    const handleSave = async () => {
        if (formData) {
            setIsSaving(true);
            try {
                await updateSettings(formData);
                alert("Settings saved successfully!");
            } catch (error) {
                console.error("Failed to save settings:", error);
                alert("Error saving settings.");
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !formData) return;

        const oldUrl = formData.logoUrl;
        setIsSaving(true);
        try {
            const url = await uploadFile(file);
            setFormData({ ...formData, logoUrl: url });
            if (oldUrl) await deleteFile(oldUrl);
        } catch (err: any) {
            alert(err.message || 'An error occurred during logo upload.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStoreBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !formData) return;

        const oldUrl = formData.storeBannerUrl;
        setIsSaving(true);
        try {
            const url = await uploadFile(file);
            setFormData({ ...formData, storeBannerUrl: url });
            if (oldUrl) await deleteFile(oldUrl);
        } catch (err: any) {
            alert(err.message || 'An error occurred during store banner upload.');
        } finally {
            setIsSaving(false);
        }
    };

    const initializeSettings = async () => {
        const defaultSettings: SettingsType = {
            appName: 'Store',
            bannerUrls: [],
            shippingFee: 0,
            whatsappNumber: '+923001234567',
            adminEmail: 'support@example.com',
            paymentMethods: [{ id: 'cod', name: 'Cash on Delivery', details: 'Pay upon receiving your order.' }],
            categories: [],
            sizeCategories: [],
            whatsappGroupUrl: '',
            whatsappChannelUrl: '',
            telegramChannelUrl: '',
            youtubeChannelUrl: '',
            instagramChannelUrl: '',
            facebookPageUrl: '',
            showJoinCommunity: true,
            showLatestUpdates: true,
            showGetApp: true,
            showContactWhatsapp: true,
            showContactEmail: true,
        };
        setIsSaving(true);
        try {
            await updateSettings(defaultSettings);
        } catch (error) {
            console.error("Failed to initialize settings:", error);
            alert("There was an error initializing settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !formData) return;

        setIsUploadingBanner(true);
        setBannerUploadError('');
        
        const uploadedUrls: string[] = [];
        try {
            for (const file of files) {
                const url = await uploadFile(file);
                uploadedUrls.push(url);
            }
            setFormData(prev => prev ? ({ ...prev, bannerUrls: [...prev.bannerUrls, ...uploadedUrls]}) : null);
        } catch (err: any) {
            setBannerUploadError(err.message || 'An error occurred during upload.');
            console.error(err);
        } finally {
            setIsUploadingBanner(false);
        }
    };

    const handleAddBannerUrl = () => {
        if (bannerUrl.trim()) {
            try {
                new URL(bannerUrl.trim());
                if (formData) {
                    setFormData({ ...formData, bannerUrls: [...formData.bannerUrls, bannerUrl.trim()] });
                }
                setBannerUrl('');
            } catch (_) {
                alert('Please enter a valid URL.');
            }
        }
    };
    
    if (isLoading) return <div className="flex justify-center p-16"><Spinner size="lg"/></div>;
    if (!settings) return (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-4">Initialize Store Settings</h2>
            <p className="text-gray-600 mb-6">Store settings are not configured. Click the button below to create them with default values.</p>
            <Button onClick={initializeSettings} disabled={isSaving}>{isSaving ? <Spinner size="sm" /> : 'Initialize Settings'}</Button>
        </div>
    );
    if (!formData) return <div className="flex justify-center p-16"><Spinner size="lg"/></div>;

    const addPaymentMethod = () => {
        if (formData && paymentInput.name && paymentInput.details) {
            const newMethod = {...paymentInput, id: safeLower(paymentInput.name).replace(/\s+/g, '-') + Date.now()};
            setFormData({...formData, paymentMethods: [...formData.paymentMethods, newMethod]});
            setPaymentInput({id: '', name: '', details: ''});
        }
    };
     const removePaymentMethod = (id: string) => {
        if (formData) setFormData({...formData, paymentMethods: formData.paymentMethods.filter(p => p.id !== id)});
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-gray-800">Store Settings</h1>
                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? <Spinner size="sm"/> : 'Save Changes'}</Button>
            </div>
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-4">General</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Input label="App Name" value={formData.appName} onChange={e => setFormData({...formData, appName: e.target.value})} placeholder="e.g. My Online Store" />
                            <Input 
                                label="Custom Domain / Website URL (Optional)" 
                                value={formData.storeDomain || ''} 
                                onChange={e => setFormData({...formData, storeDomain: e.target.value})} 
                                placeholder="e.g. https://mybrand.com (Leave empty for auto-detect)" 
                            />
                            <Input label="WhatsApp Number" value={formData.whatsappNumber} onChange={e => setFormData({...formData, whatsappNumber: e.target.value})} />
                            <Input label="Admin Contact Email" type="email" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} />
                        </div>
                        <div className="space-y-6 border-l md:border-l-0 md:pl-0 pl-4 border-gray-100 flex flex-col justify-start">
                            {/* Store Logo Row */}
                            <div className="space-y-2">
                                <h3 className="font-bold text-sm text-gray-700">Store Logo</h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                                        {formData.logoUrl ? (
                                            <img src={formData.logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-teal-100 text-teal-600 font-bold uppercase text-xl">
                                                {formData.appName?.[0] || 'S'}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant={logoInputMode === 'upload' ? 'primary' : 'secondary'} 
                                                className="px-3 py-1 h-8 text-xs"
                                                onClick={() => setLogoInputMode('upload')}
                                            >
                                                Upload File
                                            </Button>
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant={logoInputMode === 'url' ? 'primary' : 'secondary'} 
                                                className="px-3 py-1 h-8 text-xs"
                                                onClick={() => setLogoInputMode('url')}
                                            >
                                                Add URL
                                            </Button>
                                        </div>
                                        
                                        {logoInputMode === 'upload' ? (
                                            <div className="relative">
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleLogoUpload} 
                                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                                                />
                                            </div>
                                        ) : (
                                            <Input 
                                                placeholder="https://example.com/logo.png" 
                                                value={formData.logoUrl || ''} 
                                                onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                                                className="text-xs py-1 h-8"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Store Header Banner Row */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <h3 className="font-bold text-sm text-gray-700">Official Store Header Banner</h3>
                                <p className="text-xs text-gray-400">This banner displays on the product detail page for official store items.</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-24 h-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden flex-shrink-0">
                                        {formData.storeBannerUrl ? (
                                            <img src={formData.storeBannerUrl} className="w-full h-full object-cover" alt="Banner" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-teal-100 text-teal-600 font-bold uppercase text-xs text-center p-1">
                                                No Banner
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant={storeBannerInputMode === 'upload' ? 'primary' : 'secondary'} 
                                                className="px-3 py-1 h-8 text-xs"
                                                onClick={() => setStoreBannerInputMode('upload')}
                                            >
                                                Upload File
                                            </Button>
                                            <Button 
                                                type="button" 
                                                size="sm" 
                                                variant={storeBannerInputMode === 'url' ? 'primary' : 'secondary'} 
                                                className="px-3 py-1 h-8 text-xs"
                                                onClick={() => setStoreBannerInputMode('url')}
                                            >
                                                Add URL
                                            </Button>
                                        </div>
                                        
                                        {storeBannerInputMode === 'upload' ? (
                                            <div className="relative">
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleStoreBannerUpload} 
                                                    className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                                                />
                                            </div>
                                        ) : (
                                            <Input 
                                                placeholder="https://example.com/banner.png" 
                                                value={formData.storeBannerUrl || ''} 
                                                onChange={e => setFormData({ ...formData, storeBannerUrl: e.target.value })}
                                                className="text-xs py-1 h-8"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-3 text-gray-800">App Menu Visibility Options</h2>
                    <p className="text-sm text-gray-500 mb-4">Toggle visibility of these shortcuts and contact methods in the user-facing "More Options" menu.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showJoinCommunity ?? true} 
                                onChange={e => setFormData({...formData, showJoinCommunity: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Join Our Community"</span>
                                <span className="text-xs text-gray-400">Renders link to the social groups / pages</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showLatestUpdates ?? true} 
                                onChange={e => setFormData({...formData, showLatestUpdates: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Blog"</span>
                                <span className="text-xs text-gray-400">Renders link to the blog / news updates page</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showGetApp ?? true} 
                                onChange={e => setFormData({...formData, showGetApp: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Get The App"</span>
                                <span className="text-xs text-gray-400">Renders button to download the APK if set</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showContactWhatsapp ?? true} 
                                onChange={e => setFormData({...formData, showContactWhatsapp: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Contact on WhatsApp"</span>
                                <span className="text-xs text-gray-400">Renders option to directly chat on WhatsApp</span>
                            </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors md:col-span-2">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                checked={formData.showContactEmail ?? true} 
                                onChange={e => setFormData({...formData, showContactEmail: e.target.checked})} 
                            />
                            <div>
                                <span className="font-semibold text-sm text-gray-700 block">Show "Contact by Email"</span>
                                <span className="text-xs text-gray-400">Renders direct email option to your admin contact email</span>
                            </div>
                        </label>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-4">Community Links</h2>
                    <p className="text-sm text-gray-500 mb-4">Add links to your social media channels. They will appear on the "Join Community" page. Leave blank to hide.</p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input label="WhatsApp Group URL" value={formData.whatsappGroupUrl || ''} onChange={e => setFormData({...formData, whatsappGroupUrl: e.target.value})} />
                        <Input label="WhatsApp Channel URL" value={formData.whatsappChannelUrl || ''} onChange={e => setFormData({...formData, whatsappChannelUrl: e.target.value})} />
                        <Input label="Telegram Channel URL" value={formData.telegramChannelUrl || ''} onChange={e => setFormData({...formData, telegramChannelUrl: e.target.value})} />
                        <Input label="YouTube Channel URL" value={formData.youtubeChannelUrl || ''} onChange={e => setFormData({...formData, youtubeChannelUrl: e.target.value})} />
                        <Input label="Instagram Page URL" value={formData.instagramChannelUrl || ''} onChange={e => setFormData({...formData, instagramChannelUrl: e.target.value})} />
                        <Input label="Facebook Page URL" value={formData.facebookPageUrl || ''} onChange={e => setFormData({...formData, facebookPageUrl: e.target.value})} />
                    </div>
                </div>
                 <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-4">Homepage Banners</h2>
                    <div className="flex gap-2 my-2 border-b pb-3">
                        <Button type="button" size="sm" variant={bannerInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setBannerInputMode('upload')}>Upload File</Button>
                        <Button type="button" size="sm" variant={bannerInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setBannerInputMode('url')}>Add from URL</Button>
                    </div>
                    {bannerInputMode === 'upload' ? (
                        <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <Icons.image className="mx-auto h-12 w-12 text-gray-400" />
                                <label htmlFor="banner-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none">
                                    <span>Upload banner images</span>
                                    <input id="banner-upload" name="banner-upload" type="file" className="sr-only" multiple onChange={handleBannerUpload} accept="image/*" disabled={isUploadingBanner}/>
                                </label>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2 mt-2">
                            <Input label="Banner URL" placeholder="https://example.com/banner.jpg" value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBannerUrl(); } }}/>
                            <Button type="button" onClick={handleAddBannerUrl} className="self-end">Add URL</Button>
                        </div>
                    )}
                    {isUploadingBanner && <div className="mt-2"><Spinner size="sm" /></div>}
                    {bannerUploadError && <p className="mt-2 text-sm text-red-500">{bannerUploadError}</p>}
                    <div className="mt-4 space-y-2">
                        {formData.bannerUrls.map((url, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <div className="flex items-center gap-3"><ImageWithFallback src={url} className="w-16 h-9 object-cover rounded" /><span className="text-sm truncate pr-2">{url.split('/').pop()}</span></div>
                                <button onClick={() => setFormData({...formData, bannerUrls: formData.bannerUrls.filter((_, i) => i !== index)})} className="text-red-500"><Icons.trash className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-4">Payment Methods</h2>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-2 border p-4 rounded-md mb-4">
                        <Input value={paymentInput.name} onChange={e => setPaymentInput({...paymentInput, name: e.target.value})} placeholder="Method Name"/>
                        <Input value={paymentInput.details} onChange={e => setPaymentInput({...paymentInput, details: e.target.value})} placeholder="Details"/>
                        <Button type="button" onClick={addPaymentMethod}>Add Method</Button>
                    </div>
                    <div className="mt-4 space-y-2">
                        {formData.paymentMethods.map(method => (
                            <div key={method.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                <div><p className="font-semibold">{method.name}</p><p className="text-sm text-gray-500">{method.details}</p></div>
                                <button onClick={() => removePaymentMethod(method.id)} className="text-red-500"><Icons.trash className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-4">Mobile App Settings</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Provide a link to your official Android app on the Google Play Store.
                    </p>
                    
                    <div className="space-y-4">
                        <Input 
                            label="Play Store URL" 
                            placeholder="https://play.google.com/store/apps/details?id=your.package.name" 
                            value={formData.playStoreUrl || ''} 
                            onChange={e => setFormData({...formData, playStoreUrl: e.target.value})} 
                        />
                    </div>

                    <div className="mt-8 bg-teal-50 p-4 rounded-xl border border-teal-100">
                        <div className="flex items-center gap-3 text-teal-800 mb-2">
                            <Icons.smartphone className="w-5 h-5" />
                            <h3 className="font-bold text-sm uppercase tracking-tight">PWA App Enabled</h3>
                        </div>
                        <p className="text-xs text-teal-700 leading-relaxed">
                            Your store automatically works as a Progressive Web App (PWA). Customers can install it directly from their browser on Android, iOS, and Desktop without needing an app store.
                        </p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <h2 className="text-xl font-bold mb-4">Admin Security</h2>
                    <p className="text-sm text-gray-500 mb-2">To change your admin password, please use the Firebase Authentication console.</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;