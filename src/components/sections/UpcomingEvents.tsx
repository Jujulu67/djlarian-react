'use client';

import { motion } from 'framer-motion';

const events = [
  {
    id: 1,
    title: 'Electric Dreams Festival',
    date: '2024-03-15',
    time: '22:00',
    venue: 'Metropolis Arena',
    location: 'Paris, France',
    ticketUrl: '#',
  },
  {
    id: 2,
    title: 'Club Neon',
    date: '2024-03-22',
    time: '23:00',
    venue: 'Club Neon',
    location: 'Berlin, Germany',
    ticketUrl: '#',
  },
  {
    id: 3,
    title: 'Summer Vibes Festival',
    date: '2024-04-05',
    time: '20:00',
    venue: 'Beach Club',
    location: 'Ibiza, Spain',
    ticketUrl: '#',
  },
];

const UpcomingEvents = () => {
  return (
    <section className="py-20 bg-gradient-to-b from-black to-purple-900/20">
      <div className="max-w-7xl mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl md:text-5xl font-audiowide mb-12 text-center"
        >
          Upcoming Events
        </motion.h2>

        <div className="grid gap-6">
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-gray-900/50 backdrop-blur-lg rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div>
                <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                <div className="flex flex-col md:flex-row gap-2 md:gap-6 text-gray-400">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>
                      {new Date(event.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>
                      {event.venue}, {event.location}
                    </span>
                  </div>
                </div>
              </div>
              <a
                href={event.ticketUrl}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors duration-200"
              >
                Get Tickets
              </a>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <a
            href="/events"
            className="text-purple-400 hover:text-purple-300 transition-colors duration-200"
          >
            View All Events →
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default UpcomingEvents;
