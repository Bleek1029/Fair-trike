import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Header } from '../components/Chrome.jsx';
import { BottomNav } from '../components/BottomNav.jsx';
import { Footer } from '../components/Footer.jsx';
import { Icon } from '../components/Icon.jsx';
import { initialsOf, avatarUrl } from '../lib/utils.js';

const RECENT_RIDES = [
  { id: 'OLG-7721', date: 'Today, 8:45 AM', from: 'Gordon Heights', to: 'SM City Olongapo Central', dist: '4.8 km • Direct Route', driver: 'Kuya Renato', trike: 'Trike #241 (Yellow Line TODA)', initials: 'KR', fare: '₱45.00' },
  { id: 'OLG-7689', date: 'Oct 23, 5:15 PM', from: 'Mabayuan Line 1', to: 'East Bajac-Bajac Market', dist: '3.1 km • Normal Traffic', driver: 'Mang Edgardo', trike: 'Trike #088 (Red Line TODA)', initials: 'EE', fare: '₱35.00' },
  { id: 'OLG-7504', date: 'Oct 21, 1:10 PM', from: 'Subic Bay Gateway', to: 'Gordon College Main', dist: '5.5 km • Academic Corridor', driver: 'Kuya Danilo', trike: 'Trike #512 (Blue Line TODA)', initials: 'DA', fare: '₱50.00' },
];

const QUICK_DESTS = [
  { icon: 'business_center', label: 'Work', sub: 'SBMA Gate', value: 'SBMA Gate, Olongapo City' },
  { icon: 'home', label: 'Home', sub: 'Gordon Hts.', value: 'Gordon Heights, Olongapo City' },
  { icon: 'store', label: 'SM Central', sub: 'Magsaysay Dr.', value: 'SM City Olongapo Central, Magsaysay Drive' },
  { icon: 'shopping_cart', label: 'Public Market', sub: 'Bajac-Bajac', value: 'Olongapo City Public Market, Bajac-Bajac' },
];

export function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState('Current Location (Brgy. East Bajac-Bajac Plaza)');
  const [destination, setDestination] = useState('');
  const fullname = user?.fullname || 'Juan Dela Cruz';
  const email = user?.email || 'juan.delacruz@email.ph';
  const avatar = avatarUrl(user?.profilePicture);
  const initials = initialsOf(fullname);
  const memberYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : 2024;
  const requestRide = () => navigate('/app', { state: { pickup, destination } });
  return (
    <div className="w-full min-h-screen bg-surface text-on-surface text-body-md" style={{ paddingTop: '5rem' }}>
      <Header />
      <main className="w-full bg-surface">
        <div className="flex flex-col w-full">
          <div className="w-full max-w-[1280px] mx-auto px-margin lg:px-margin-desktop py-space-lg flex flex-col gap-space-xl">
            <div className="relative overflow-hidden bg-surface-container-low rounded-2xl p-space-lg lg:p-space-xl shadow-sm">
              <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-container/15 blur-3xl pointer-events-none" />
              <div className="absolute left-1/3 -bottom-20 w-64 h-64 rounded-full bg-tertiary-container/10 blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg">
                <div className="flex flex-col gap-space-xs">
                  <div className="flex flex-wrap items-center gap-space-xs">
                    <span className="px-space-sm py-0.5 rounded-full bg-tertiary-container/20 text-on-tertiary-container text-label-sm flex items-center gap-1">
                      <Icon name="verified" size={14} filled /> Verified Olongapo Commuter
                    </span>
                    <span className="text-secondary text-label-sm">•</span>
                    <span className="text-label-sm text-secondary">Brgy. East Bajac-Bajac Transit Hub</span>
                  </div>
                  <h1 className="text-display tracking-tight text-on-surface">Welcome back, <span className="text-primary-container">{fullname}!</span></h1>
                  <p className="text-body-md text-on-surface-variant max-w-2xl">Tricycle lines across Gordon Heights, Mabayuan, and Subic Gateway are running on smooth municipal schedules today.</p>
                </div>
                <div className="flex items-center gap-space-md bg-surface-container-lowest p-space-md rounded-xl shadow-sm self-start lg:self-auto">
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-primary-fixed-variant"><Icon name="wb_sunny" size={28} /></div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-space-xs"><span className="text-headline-md text-on-surface">29°C</span><span className="text-label-sm text-secondary uppercase">Sunny</span></div>
                    <span className="text-body-sm text-on-surface-variant">East Bajac-Bajac • Low Humidity</span>
                  </div>
                  <div className="h-8 w-px bg-surface-container mx-space-xs" />
                  <div className="flex flex-col items-end">
                    <span className="text-label-sm text-tertiary font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary animate-ping" /> 98.4% On-Time</span>
                    <span className="text-body-sm text-secondary">Zone Tariffs Active</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
              <div className="lg:col-span-5 flex flex-col gap-space-lg">
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <span className="text-label-sm uppercase tracking-wider text-secondary font-bold">Commuter Credentials</span>
                    <span className="text-label-sm px-2.5 py-0.5 rounded-full bg-surface-container text-on-secondary-fixed">Zone A Passholder</span>
                  </div>
                  <div className="flex items-center gap-space-md pt-space-xs">
                    <div className="relative">
                      {avatar ? (
                        <img alt="profile" className="w-[72px] h-[72px] rounded-full object-cover shadow-sm ring-2 ring-primary-container/40" src={avatar} />
                      ) : (
                        <div className="w-[72px] h-[72px] rounded-full shadow-sm ring-2 ring-primary-container/40 bg-primary-fixed flex items-center justify-center text-headline-md font-bold">{initials}</div>
                      )}
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-tertiary ring-2 ring-surface-container-lowest" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h2 className="text-headline-md text-on-surface truncate">{fullname}</h2>
                      <span className="text-body-sm text-secondary truncate">{email}</span>
                      <div className="flex items-center gap-space-xs mt-1">
                        <span className="text-label-sm px-2 py-0.5 rounded bg-surface-container-high font-bold">#FT-9042</span>
                        <span className="text-body-sm text-on-surface-variant">Member since {memberYear}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-space-sm bg-surface-container-low p-space-sm rounded-xl text-center">
                    <div className="flex flex-col"><span className="text-headline-sm font-bold">142</span><span className="text-label-sm text-secondary">Rides Taken</span></div>
                    <div className="flex flex-col"><span className="text-headline-sm text-tertiary font-bold">P0.00</span><span className="text-label-sm text-secondary">Overcharges</span></div>
                    <div className="flex flex-col"><span className="text-headline-sm text-primary font-bold">5.0</span><span className="text-label-sm text-secondary">Rating</span></div>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-inverse-surface text-inverse-on-surface rounded-2xl p-space-lg shadow-md flex flex-col justify-between min-h-[260px]">
                  <div className="absolute right-0 top-0 w-48 h-48 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shadow-sm"><Icon name="account_balance_wallet" size={22} /></div>
                      <div className="flex flex-col"><span className="text-label-sm text-surface-variant uppercase tracking-wider">Fairtrike Wallet</span><span className="text-label-md">Auto-Deduct Fare System</span></div>
                    </div>
                    <span className="px-space-sm py-1 rounded-full bg-surface-container-highest/20 text-label-sm">Active Balance</span>
                  </div>
                  <div className="my-space-md">
                    <div className="flex items-baseline gap-space-xs"><span className="text-display">P350.00</span><span className="text-label-md font-medium">PHP</span></div>
                    <p className="text-body-sm mt-1">Estimated ~7 city zone trips remaining before recharge.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-space-sm pt-space-xs">
                    <button type="button" className="w-full sm:w-auto flex-1 h-[48px] px-space-md rounded-xl bg-primary-container text-on-primary-container text-label-lg flex items-center justify-center gap-space-xs shadow-sm"><Icon name="add_circle" size={20} /> Top Up Credits</button>
                    <div className="w-full sm:w-auto flex items-center gap-space-xs px-space-md h-[48px] rounded-xl bg-inverse-on-surface/10 text-label-md"><Icon name="link" size={20} /><span>GCash (88) Linked</span></div>
                  </div>
                </div>
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center"><Icon name="security" size={18} /></div>
                      <span className="text-headline-sm font-bold">Security and Settings</span>
                    </div>
                    <Link to="/app" className="text-label-md text-primary font-bold hover:underline">Manage</Link>
                  </div>
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-xl">
                      <div className="flex items-center gap-space-sm"><Icon name="notifications_active" size={20} /><span className="text-body-md">SMS Trip Confirmations</span></div>
                      <span className="text-label-sm text-tertiary font-bold">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between p-space-sm bg-surface-container-low rounded-xl">
                      <div className="flex items-center gap-space-sm"><Icon name="pin" size={20} /><span className="text-body-md">Transit Safety PIN (Ride Start)</span></div>
                      <span className="text-label-sm text-tertiary font-bold">Required</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 flex flex-col gap-space-lg">
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shadow-sm"><Icon name="electric_rickshaw" size={24} /></div>
                      <div><h2 className="text-headline-md">Instant Tricycle Hailing</h2><span className="text-body-sm text-secondary">Verified TODA drivers nearby</span></div>
                    </div>
                    <span className="px-space-sm py-1 rounded-full bg-surface-container text-label-sm">Terminal: Bajac-Bajac Rotonda</span>
                  </div>
                  <div className="flex flex-col gap-space-xs pt-space-xs">
                    <span className="text-label-sm uppercase text-secondary font-bold">Quick Destination Selector</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
                      {QUICK_DESTS.map((d) => (
                        <button key={d.label} type="button" onClick={() => setDestination(d.value)} className="flex flex-col items-center justify-center p-space-md rounded-xl bg-surface-container-low text-center">
                          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center mb-1"><Icon name={d.icon} size={18} /></div>
                          <span className="text-label-md font-bold">{d.label}</span>
                          <span className="text-body-sm text-secondary">{d.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-space-sm pt-space-xs">
                    <div className="flex items-center bg-surface-container-low rounded-xl px-space-md h-[52px]">
                      <span className="mr-space-sm"><Icon name="my_location" size={20} /></span>
                      <input className="w-full bg-transparent focus:outline-none" placeholder="Enter pickup spot" type="text" value={pickup} onChange={(e) => setPickup(e.target.value)} />
                    </div>
                    <div className="flex items-center bg-surface-container-low rounded-xl px-space-md h-[52px]">
                      <span className="mr-space-sm"><Icon name="location_on" size={20} /></span>
                      <input className="w-full bg-transparent focus:outline-none" placeholder="Where to in Olongapo City?" type="text" value={destination} onChange={(e) => setDestination(e.target.value)} />
                    </div>
                  </div>
                  <button type="button" onClick={requestRide} className="w-full h-[52px] rounded-xl bg-primary-container text-on-primary-container font-bold flex items-center justify-center gap-space-sm"><Icon name="two_wheeler" size={22} /> Request Tricycle Ride</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center mb-space-xs"><Icon name="price_change" size={22} /></div>
                      <h3 className="text-headline-sm">Fare Matrix and Tariffs</h3>
                      <p className="text-body-sm text-secondary">Review official distance rates and flag-downs.</p>
                    </div>
                    <Link to="/app" className="mt-space-md text-label-md text-primary font-bold flex items-center gap-1">Open Rate Sheet <Icon name="arrow_forward" size={16} /></Link>
                  </div>
                  <div className="bg-surface-container-lowest p-space-md rounded-2xl shadow-sm flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center mb-space-xs"><Icon name="receipt_long" size={22} /></div>
                      <h3 className="text-headline-sm">Trips and Receipts</h3>
                      <p className="text-body-sm text-secondary">Official receipts and expense records.</p>
                    </div>
                    <a href="#recent-rides" className="mt-space-md text-label-md text-primary font-bold flex items-center gap-1">View History <Icon name="arrow_forward" size={16} /></a>
                  </div>
                  <div className="bg-error-container/20 p-space-md rounded-2xl shadow-sm flex flex-col justify-between">
                    <div className="flex flex-col gap-space-xs">
                      <div className="w-10 h-10 rounded-xl bg-error text-on-error flex items-center justify-center mb-space-xs"><Icon name="e911_emergency" size={22} /></div>
                      <h3 className="text-headline-sm">Emergency / SOS</h3>
                      <p className="text-body-sm text-secondary">Dispatch to Police and Barangay Desk.</p>
                    </div>
                    <a href="tel:911" className="mt-space-md w-full h-[40px] rounded-lg bg-error text-on-error text-label-md font-bold flex items-center justify-center gap-1"><Icon name="call" size={16} /> Barangay SOS (911)</a>
                  </div>
                </div>
              </div>
            </div>

            <div id="recent-rides" className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center"><Icon name="history" size={24} /></div>
                  <div><h2 className="text-headline-md">Recent Rides and Dispatches</h2><span className="text-body-sm text-secondary">Audited municipal transactions</span></div>
                </div>
                <div className="flex items-center gap-space-sm">
                  <span className="text-label-md text-secondary">Filter by:</span>
                  <div className="px-space-sm py-1 rounded-lg bg-surface-container-low text-label-sm font-bold">All Franchises</div>
                </div>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/70">
                      <th className="py-space-sm px-space-md text-label-md uppercase text-secondary rounded-l-lg">Date and Time</th>
                      <th className="py-space-sm px-space-md text-label-md uppercase text-secondary">Route</th>
                      <th className="py-space-sm px-space-md text-label-md uppercase text-secondary">Driver</th>
                      <th className="py-space-sm px-space-md text-label-md uppercase text-secondary">Fare</th>
                      <th className="py-space-sm px-space-md text-label-md uppercase text-secondary">Status</th>
                      <th className="py-space-sm px-space-md text-label-md uppercase text-secondary text-right rounded-r-lg">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-md">
                    {RECENT_RIDES.map((r) => (
                      <tr key={r.id} className="hover:bg-surface-container-low">
                        <td className="py-space-md px-space-md whitespace-nowrap"><div className="flex flex-col"><span className="text-label-lg">{r.date}</span><span className="text-body-sm text-secondary">Trip #{r.id}</span></div></td>
                        <td className="py-space-md px-space-md"><div className="flex items-center gap-space-xs text-headline-sm"><span>{r.from}</span><Icon name="arrow_forward" size={16} /><span>{r.to}</span></div><span className="text-body-sm text-secondary block">Distance: {r.dist}</span></td>
                        <td className="py-space-md px-space-md"><div className="flex items-center gap-space-sm"><div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-label-sm font-bold">{r.initials}</div><div className="flex flex-col"><span className="text-label-lg">{r.driver}</span><span className="text-body-sm text-secondary">{r.trike}</span></div></div></td>
                        <td className="py-space-md px-space-md whitespace-nowrap"><span className="text-headline-sm font-bold">{r.fare}</span><span className="text-body-sm text-secondary block">Fairtrike Wallet</span></td>
                        <td className="py-space-md px-space-md whitespace-nowrap"><span className="px-space-sm py-1 rounded-full bg-tertiary-container/20 text-label-sm font-bold flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Completed</span></td>
                        <td className="py-space-md px-space-md text-right whitespace-nowrap"><button type="button" className="px-space-sm py-1.5 rounded-lg bg-surface-container text-label-sm font-bold inline-flex items-center gap-1"><Icon name="download" size={16} /> PDF</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pt-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm">
                <span className="text-body-sm text-secondary">Showing recent 3 trips of 142 total commutes</span>
                <button type="button" className="px-space-md py-2 rounded-xl bg-surface-container-low text-label-md font-bold">Load Full Municipal Travel Log</button>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between p-space-lg rounded-2xl bg-surface-container-low gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center shrink-0"><Icon name="electric_rickshaw" size={22} /></div>
                <div className="h-6 w-px bg-surface-container-highest" />
                <p className="text-body-sm text-on-surface-variant">Authorized under the <strong>Olongapo City Tricycle Regulatory Ordinance</strong>. Regulated rates protect passengers from surge.</p>
              </div>
              <div className="flex items-center gap-space-sm"><span className="text-label-sm text-secondary whitespace-nowrap">Fair Fare Certified</span><span className="w-2 h-2 rounded-full bg-tertiary" /></div>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
      <Footer />
    </div>
  );
}

