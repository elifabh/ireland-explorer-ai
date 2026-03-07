import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Search, RefreshCw, Star, MapIcon, Inbox, MousePointer2 } from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE = 'http://localhost:8000/api';
const ADMIN_API_KEY = 'demo-admin-key-12345';
axios.defaults.headers.common['X-Admin-API-Key'] = ADMIN_API_KEY;

interface DamageReport {
  id: string;
  user_id: string;
  poi_id: string;
  poi_name: string;
  description: string;
  damage_type: string;
  score: number;
  confidence: number;
  status: string;
  lat?: number;
  lng?: number;
  photo_url: string;
  photo_base64?: string;
  reviewer_notes?: string;
  created_at: string;
}

interface AdminInbox {
  _id: string;
  to: string;
  subject: string;
  body: string;
  created_at: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'reports' | 'inbox'>('reports');
  const [reports, setReports] = useState<DamageReport[]>([]);
  const [inboxEmails, setInboxEmails] = useState<AdminInbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DamageReport | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'review_required' | 'approved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'vandalism' | 'graffiti' | 'structural' | 'erosion' | 'littering' | 'vegetation_damage' | 'other'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'reports') {
        const res = await axios.get<DamageReport[]>(`${API_BASE}/damage-reports`);
        setReports(res.data);
      } else {
        const res = await axios.get<AdminInbox[]>(`${API_BASE}/admin/inbox`);
        setInboxEmails(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleReview = async (id: string, status: 'approved' | 'rejected', notes: string = '') => {
    try {
      await axios.post(`${API_BASE}/damage-reports/${id}/review`, null, {
        params: { status, reason: notes }
      });
      fetchData();
      setSelectedReport(null);
    } catch (err) {
      console.error('Failed to review report:', err);
      alert('Review action failed. Please check backend.');
    }
  };

  const filteredReports = reports.filter(r => {
    const matchStatus = filter === 'all' ? true : r.status === filter;
    const matchType = typeFilter === 'all' ? true : r.damage_type === typeFilter;
    return matchStatus && matchType;
  });

  return (
    <div className="min-w-full min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-emerald-900 border-b border-emerald-800 text-white shadow-md flex-none z-50">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            <h1 className="text-xl font-bold tracking-tight">Ireland Heritage Guardian<span className="font-light text-emerald-300 ml-2 hidden sm:inline">| Command Center</span></h1>
          </div>
          <div className="flex items-center space-x-4 sm:space-x-6">
            <div className="flex bg-emerald-800 rounded-lg p-1">
              <button
                onClick={() => { setActiveTab('reports'); setSelectedReport(null); }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'reports' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:text-white hover:bg-emerald-700/50'}`}>
                <MapIcon className="w-4 h-4" /> Reports
              </button>
              <button
                onClick={() => { setActiveTab('inbox'); setSelectedReport(null); }}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'inbox' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-100 hover:text-white hover:bg-emerald-700/50'}`}>
                <Inbox className="w-4 h-4" /> System Inbox
              </button>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center justify-center p-2 rounded-lg bg-emerald-800 text-emerald-100 hover:text-white hover:bg-emerald-700 transition duration-150 shadow-sm border border-emerald-700 hover:border-emerald-600"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="px-3 py-1 bg-emerald-800 rounded-full text-xs font-semibold flex items-center gap-2 hidden sm:flex">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            LIVE
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full p-4 sm:p-6 flex flex-col overflow-hidden">

        {activeTab === 'reports' ? (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 w-full">
            {/* Left Col: List */}
            <div className="lg:col-span-2 xl:col-span-1 bg-white rounded-xl shadow border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Incoming Reports</h2>
                <button onClick={fetchData} className="p-2 text-slate-500 hover:text-emerald-600 transition-colors bg-white rounded-full shadow-sm border border-slate-200" title="Refresh">
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="p-4 border-b border-slate-100 shrink-0 bg-white">
                <div className="text-base font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Status Filter</div>
                <div className="flex gap-2 flex-wrap mb-6">
                  {['all', 'review_required', 'pending', 'approved', 'rejected'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={`px-4 py-1.5 text-sm font-semibold rounded-full capitalize transition-colors ${filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div className="text-base font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1 mt-2">Damage Type Filter</div>
                <div className="flex gap-2.5 flex-wrap">
                  {['all', 'vandalism', 'graffiti', 'structural', 'erosion', 'littering', 'vegetation_damage'].map(t => {
                    let activeColorClass = 'bg-indigo-600';
                    let idleColorClass = 'text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100';
                    if (t === 'vandalism') { activeColorClass = 'bg-red-500'; idleColorClass = 'text-red-600 bg-red-50 border border-red-100 hover:bg-red-100'; }
                    if (t === 'graffiti') { activeColorClass = 'bg-pink-500'; idleColorClass = 'text-pink-600 bg-pink-50 border border-pink-100 hover:bg-pink-100'; }
                    if (t === 'structural') { activeColorClass = 'bg-orange-500'; idleColorClass = 'text-orange-600 bg-orange-50 border border-orange-100 hover:bg-orange-100'; }
                    if (t === 'erosion') { activeColorClass = 'bg-purple-500'; idleColorClass = 'text-purple-600 bg-purple-50 border border-purple-100 hover:bg-purple-100'; }
                    if (t === 'littering') { activeColorClass = 'bg-teal-500'; idleColorClass = 'text-teal-600 bg-teal-50 border border-teal-100 hover:bg-teal-100'; }
                    if (t === 'vegetation_damage') { activeColorClass = 'bg-lime-500'; idleColorClass = 'text-lime-700 bg-lime-50 border border-lime-100 hover:bg-lime-100'; }

                    return (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t as any)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md uppercase tracking-wide transition-colors ${typeFilter === t ? `${activeColorClass} text-white shadow-sm ring-1 ring-offset-1 ring-${activeColorClass.replace('bg-', '')}` : idleColorClass}`}>
                        {t.replace('_', ' ')}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {loading && reports.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                    <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                    <p>Syncing signals...</p>
                  </div>
                ) : filteredReports.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No reports found.</p>
                  </div>
                ) : (
                  filteredReports.map(report => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedReport?.id === report.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-800 text-sm truncate pr-2">{report.poi_name || 'Unknown POI'}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide shrink-0 ${report.status === 'review_required' ? 'bg-amber-100 text-amber-800' :
                          report.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            report.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-slate-100 text-slate-800'
                          }`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="text-xs text-slate-500">
                          <p className="mb-1"><span className="font-medium text-slate-700 capitalize">Type:</span> {report.damage_type.replace('_', ' ')}</p>
                          <p><span className="font-medium text-slate-700">Date:</span> {format(new Date(report.created_at), 'dd MMM yy, HH:mm')}</p>
                        </div>
                        {report.confidence > 0 && (
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-[10px] text-slate-400 font-semibold mb-0.5">AI CONFIDENCE</span>
                            <div className={`px-1.5 py-0.5 rounded text-xs font-bold ${report.confidence >= 0.7 ? 'bg-emerald-100 text-emerald-700' :
                              report.confidence >= 0.4 ? 'bg-amber-100 text-amber-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                              {Math.round(report.confidence * 100)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Col: Detail View OR Map */}
            <div className="lg:col-span-3 xl:col-span-4 shadow border border-slate-200 rounded-xl overflow-hidden bg-white relative flex flex-col h-full z-0">
              {!selectedReport ? (
                <div className="flex-1 w-full h-full relative z-0">
                  <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur p-4 rounded-lg shadow-lg border border-slate-200 pointer-events-none max-w-sm">
                    <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2"><MapIcon className="w-4 h-4 text-emerald-600" /> Live Operations Map</h3>
                    <p className="text-xs text-slate-500 mt-2">All damage incidents are mapped securely. Click a marker to explore, or select an item from the feed on the left side to review AI Analysis.</p>
                  </div>
                  <MapContainer
                    center={[53.3498, -8.2603]}
                    zoom={7}
                    className="w-full h-full z-0"
                    scrollWheelZoom={true}
                    minZoom={6}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {filteredReports.filter(rp => rp.lat !== undefined && rp.lng !== undefined).map(rp => {
                      // Damage Type Color Logic for Markers
                      let markerColor = "#6366f1"; // Default Indigo
                      switch (rp.damage_type) {
                        case 'vandalism': markerColor = "#ef4444"; break; // Red
                        case 'graffiti': markerColor = "#ec4899"; break; // Pink
                        case 'structural': markerColor = "#f97316"; break; // Orange
                        case 'erosion': markerColor = "#8b5cf6"; break; // Purple
                        case 'littering': markerColor = "#14b8a6"; break; // Teal
                        case 'vegetation_damage': markerColor = "#84cc16"; break; // Lime
                      }

                      const customIcon = L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                        iconSize: [14, 14],
                        iconAnchor: [7, 7]
                      });

                      return (
                        <Marker key={rp.id} position={[rp.lat!, rp.lng!]} icon={customIcon}>
                          <Popup>
                            <div className="font-sans">
                              <h3 className="font-bold text-sm text-slate-800 mb-1">{rp.poi_name}</h3>
                              <div className="flex items-center gap-1.5 mb-2">
                                <span style={{ backgroundColor: markerColor }} className="w-2.5 h-2.5 rounded-full inline-block"></span>
                                <p className="text-xs text-slate-600 capitalize">{rp.damage_type.replace('_', ' ')}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReport(rp);
                                }}
                                className="w-full text-center py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded transition-colors"
                              >
                                Review Report
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden h-full z-10 bg-white">
                  <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 shrink-0 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => setSelectedReport(null)} className="p-1 hover:bg-slate-200 rounded shrink-0 mr-1" title="Back to Map">
                          <MousePointer2 className="w-4 h-4 text-emerald-700 -rotate-90" />
                        </button>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">{selectedReport.poi_name || 'Unknown Location'}</h2>
                      </div>
                      <p className="text-slate-500 text-xs sm:text-sm flex items-center gap-2 mt-1 sm:mt-0 ml-8 sm:ml-0">
                        Report ID: <span className="font-mono text-xs bg-slate-200 px-1 rounded">{selectedReport.id.substring(0, 8)}...</span>
                      </p>
                    </div>
                    {['review_required', 'pending'].includes(selectedReport.status) ? (
                      <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
                        <button onClick={() => handleReview(selectedReport.id, 'rejected')} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold text-sm transition-colors shadow-sm min-w-[100px]">
                          <XCircle className="w-4 h-4" /> REJECT
                        </button>
                        <button onClick={() => handleReview(selectedReport.id, 'approved')} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm">
                          <CheckCircle className="w-4 h-4" /> APPROVE & REWARD
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-semibold flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> ALREADY RESOLVED
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Image col */}
                      <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Evidence Photo</h3>
                        <div className="w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 aspect-[4/3] sm:aspect-square flex items-center justify-center relative shadow-inner">
                          {selectedReport.photo_base64 ? (
                            <img src={`data:image/jpeg;base64,${selectedReport.photo_base64}`} alt="Damage Evidence" className="w-full h-full object-cover" />
                          ) : selectedReport.photo_url ? (
                            <div className="text-slate-400 text-sm flex flex-col items-center">
                              <span>Photo stored in object storage</span>
                              <span className="text-xs font-mono mt-1">{selectedReport.photo_url}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 flex flex-col items-center">
                              <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
                              No photo provided
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detail col */}
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">User Description</h3>
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 text-sm leading-relaxed overflow-hidden break-words">
                            "{selectedReport.description}"
                          </div>
                        </div>

                        <div className="border border-indigo-100 rounded-lg overflow-hidden relative shadow-sm">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                          <div className="bg-indigo-50 p-3 border-b border-indigo-100 flex items-center gap-2 text-indigo-800">
                            <Star className="w-4 h-4 fill-indigo-200" />
                            <h3 className="text-sm font-bold uppercase tracking-wide">AI Assessment</h3>
                          </div>
                          <div className="bg-white p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs text-slate-400 uppercase">Analysis</span>
                                <p className="font-semibold text-slate-800 capitalize truncate" title={selectedReport.damage_type.replace('_', ' ')}>{selectedReport.damage_type.replace('_', ' ')}</p>
                              </div>
                              <div>
                                <span className="text-xs text-slate-400 uppercase">Severity</span>
                                <div className="flex items-center mt-0.5">
                                  <span className={`w-2 h-2 rounded-full mr-2 shrink-0 ${selectedReport.score >= 0.7 ? 'bg-rose-500' :
                                    selectedReport.score >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}></span>
                                  <p className="font-semibold text-slate-800 capitalize">
                                    {selectedReport.score >= 0.7 ? 'High' : selectedReport.score >= 0.4 ? 'Medium' : 'Low'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-5 pt-4 border-t border-slate-100">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-semibold text-slate-500 uppercase">Match Confidence</span>
                                <span className="text-xs font-bold text-indigo-600">{Math.round(selectedReport.confidence * 100)}%</span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-in-out" style={{ width: `${selectedReport.confidence * 100}%` }}></div>
                              </div>
                              {(selectedReport.confidence < 0.4 || selectedReport.damage_type === "false_report") && (
                                <div className="mt-4 bg-rose-50 border border-rose-100 p-3 rounded-md flex items-start gap-2">
                                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-rose-700 leading-snug font-medium">Warning: AI marked this as a potential false report or spam. Proceed with caution.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reporter Profile</h3>
                          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold border border-emerald-200 shrink-0">
                              U
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">Trusted Tourist</p>
                              <p className="text-xs text-slate-500 font-mono truncate">{selectedReport.user_id.substring(0, 12)}...</p>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col w-full h-full pb-6">
            <div className="bg-white rounded-xl shadow border border-slate-200 h-full flex flex-col overflow-hidden w-full max-w-4xl mx-auto">
              <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full justify-center items-center flex shrink-0">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">System Notifications</h2>
                    <p className="text-sm text-slate-500">Live feed of outbound administrative alerts.</p>
                  </div>
                </div>
                <button onClick={fetchData} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors bg-white rounded-md shadow-sm border border-slate-200" title="Refresh">
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">
                {loading && inboxEmails.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="h-8 w-8 text-slate-300 animate-spin" />
                  </div>
                ) : inboxEmails.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Inbox className="w-16 h-16 text-slate-200 mb-4" />
                    <p className="font-semibold text-lg">No Notifications Yet</p>
                    <p className="text-sm mt-1 max-w-sm text-center">When tourists report damage, the system will automatically dispatch alert emails here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inboxEmails.map(email => (
                      <div key={email._id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 hover:border-indigo-300 transition-colors relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-slate-800 text-base">{email.subject}</h3>
                            <p className="text-xs text-slate-500 mt-1 font-mono">To: {email.to}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap ml-4">
                            {format(new Date(email.created_at), 'dd MMM yy, HH:mm')}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded border border-slate-100 text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: email.body }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
        }

      </main >
    </div >
  );
}
