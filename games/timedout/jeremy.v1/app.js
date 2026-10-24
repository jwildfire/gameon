// ============================================================
// TIMED OUT - A Wikipedia-powered timeline game
// ============================================================

const MAX_LIVES = 3;
const EVENTS_PER_GAME = 20;

// ============ Curated Event Pools by Difficulty ============
// Easy: Iconic events everyone learns in school
const EASY_EVENTS = [
    // Original 25
    { year: 1492, text: "Christopher Columbus reaches the Americas" },
    { year: 1776, text: "The United States Declaration of Independence is adopted" },
    { year: 1789, text: "The French Revolution begins with the storming of the Bastille" },
    { year: 1861, text: "The American Civil War begins" },
    { year: 1865, text: "Abraham Lincoln is assassinated at Ford's Theatre" },
    { year: 1876, text: "Alexander Graham Bell patents the telephone" },
    { year: 1903, text: "The Wright Brothers achieve the first powered airplane flight" },
    { year: 1912, text: "The RMS Titanic sinks on its maiden voyage" },
    { year: 1914, text: "World War I begins after the assassination of Archduke Franz Ferdinand" },
    { year: 1929, text: "The Wall Street Crash triggers the Great Depression" },
    { year: 1939, text: "World War II begins as Germany invades Poland" },
    { year: 1941, text: "Japan attacks Pearl Harbor, bringing the US into World War II" },
    { year: 1945, text: "The United States drops atomic bombs on Hiroshima and Nagasaki" },
    { year: 1947, text: "India gains independence from British rule" },
    { year: 1955, text: "Rosa Parks refuses to give up her bus seat, sparking the Montgomery Bus Boycott" },
    { year: 1963, text: "Martin Luther King Jr. delivers his 'I Have a Dream' speech" },
    { year: 1969, text: "Neil Armstrong and Buzz Aldrin become the first humans to walk on the Moon" },
    { year: 1989, text: "The Berlin Wall falls, marking the end of the Cold War era" },
    { year: 1994, text: "Nelson Mandela becomes the first Black president of South Africa" },
    { year: 2001, text: "The September 11 attacks occur in the United States" },
    { year: 2007, text: "Apple releases the first iPhone" },
    { year: 2020, text: "The COVID-19 pandemic spreads worldwide" },
    { year: 1957, text: "The Soviet Union launches Sputnik, the first artificial satellite" },
    { year: 1953, text: "Edmund Hillary and Tenzing Norgay reach the summit of Mount Everest" },
    { year: 2004, text: "Facebook is founded by Mark Zuckerberg" },
    // Ancient & Medieval
    { year: 753, text: "According to legend, Rome is founded by Romulus and Remus" },
    { year: 1066, text: "William the Conqueror wins the Battle of Hastings" },
    { year: 1347, text: "The Black Death arrives in Europe, killing millions" },
    { year: 1455, text: "Johannes Gutenberg prints the first Bible using movable type" },
    // Age of Exploration & Renaissance
    { year: 1503, text: "Leonardo da Vinci begins painting the Mona Lisa" },
    { year: 1519, text: "Ferdinand Magellan begins the first voyage around the world" },
    { year: 1588, text: "The English Navy defeats the Spanish Armada" },
    { year: 1620, text: "The Pilgrims arrive at Plymouth Rock aboard the Mayflower" },
    { year: 1666, text: "The Great Fire of London destroys much of the city" },
    // 1700s
    { year: 1752, text: "Benjamin Franklin flies a kite in a thunderstorm to study electricity" },
    { year: 1770, text: "Ludwig van Beethoven is born in Bonn, Germany" },
    { year: 1773, text: "The Boston Tea Party protests British taxation in colonial America" },
    { year: 1783, text: "The first hot air balloon flight takes place in Paris" },
    { year: 1799, text: "The Rosetta Stone is discovered in Egypt" },
    // Early 1800s
    { year: 1804, text: "Napoleon Bonaparte crowns himself Emperor of France" },
    { year: 1815, text: "Napoleon is defeated at the Battle of Waterloo" },
    { year: 1825, text: "The world's first public railway opens in England" },
    { year: 1835, text: "Charles Darwin visits the Galapagos Islands on HMS Beagle" },
    { year: 1848, text: "The California Gold Rush begins after gold is found at Sutter's Mill" },
    // Mid-Late 1800s
    { year: 1859, text: "Charles Darwin publishes On the Origin of Species" },
    { year: 1863, text: "Abraham Lincoln issues the Emancipation Proclamation" },
    { year: 1869, text: "The Transcontinental Railroad is completed in the United States" },
    { year: 1879, text: "Thomas Edison demonstrates the first practical electric light bulb" },
    { year: 1886, text: "The Statue of Liberty is dedicated in New York Harbor" },
    { year: 1889, text: "The Eiffel Tower is completed for the Paris World's Fair" },
    { year: 1896, text: "The first modern Olympic Games are held in Athens, Greece" },
    // Early 1900s
    { year: 1901, text: "Queen Victoria dies after 63 years on the British throne" },
    { year: 1905, text: "Albert Einstein publishes his special theory of relativity" },
    { year: 1906, text: "A massive earthquake and fire devastate San Francisco" },
    { year: 1908, text: "Henry Ford introduces the Model T automobile" },
    { year: 1917, text: "The Russian Revolution overthrows the Tsar" },
    { year: 1918, text: "World War I ends with the signing of the Armistice" },
    { year: 1920, text: "American women win the right to vote with the 19th Amendment" },
    { year: 1927, text: "Charles Lindbergh completes the first solo transatlantic flight" },
    { year: 1928, text: "Alexander Fleming discovers penicillin" },
    // 1930s-1940s
    { year: 1933, text: "Adolf Hitler becomes Chancellor of Germany" },
    { year: 1937, text: "The Hindenburg airship explodes in New Jersey" },
    { year: 1944, text: "Allied forces land on the beaches of Normandy on D-Day" },
    { year: 1948, text: "The State of Israel is established" },
    { year: 1949, text: "NATO is founded as a Western military alliance" },
    // 1950s-1960s
    { year: 1950, text: "The Korean War begins" },
    { year: 1954, text: "Roger Bannister runs the first sub-four-minute mile" },
    { year: 1959, text: "Fidel Castro takes power in Cuba" },
    { year: 1961, text: "Yuri Gagarin becomes the first human in space" },
    { year: 1962, text: "The Cuban Missile Crisis brings the world to the brink of nuclear war" },
    { year: 1964, text: "The Beatles arrive in America, launching the British Invasion" },
    { year: 1966, text: "England wins the FIFA World Cup for the first and only time" },
    { year: 1968, text: "Martin Luther King Jr. is assassinated in Memphis, Tennessee" },
    // 1970s
    { year: 1971, text: "Walt Disney World opens in Orlando, Florida" },
    { year: 1972, text: "The Watergate scandal begins with a break-in at Democratic headquarters" },
    { year: 1975, text: "The Vietnam War ends with the fall of Saigon" },
    { year: 1976, text: "Apple Computer is founded by Steve Jobs and Steve Wozniak" },
    { year: 1977, text: "Star Wars is released in theaters and becomes a cultural phenomenon" },
    { year: 1979, text: "Margaret Thatcher becomes Britain's first female Prime Minister" },
    // 1980s
    { year: 1980, text: "John Lennon is shot and killed in New York City" },
    { year: 1981, text: "Princess Diana marries Prince Charles in a globally televised wedding" },
    { year: 1984, text: "The Apple Macintosh personal computer is introduced" },
    { year: 1986, text: "The Chernobyl nuclear disaster occurs in Ukraine" },
    // 1990s
    { year: 1990, text: "Tim Berners-Lee invents the World Wide Web" },
    { year: 1991, text: "The Soviet Union officially dissolves" },
    { year: 1993, text: "Jurassic Park becomes the highest-grossing film at the time" },
    { year: 1997, text: "Princess Diana dies in a car crash in Paris" },
    { year: 1998, text: "Google is founded by Larry Page and Sergey Brin" },
    { year: 1999, text: "The Euro currency is introduced across much of Europe" },
    // 2000s
    { year: 2003, text: "The Human Genome Project is completed" },
    { year: 2005, text: "Hurricane Katrina devastates New Orleans" },
    { year: 2008, text: "Barack Obama is elected as the first Black president of the United States" },
    { year: 2009, text: "Michael Jackson dies, sparking worldwide mourning" },
    // 2010s-2020s
    { year: 2010, text: "The Deepwater Horizon oil spill becomes the worst in US history" },
    { year: 2011, text: "Osama bin Laden is killed by US forces in Pakistan" },
    { year: 2012, text: "The Higgs boson particle is discovered at CERN" },
    { year: 2014, text: "The Ice Bucket Challenge goes viral, raising awareness for ALS" },
    { year: 2016, text: "The United Kingdom votes to leave the European Union" },
    { year: 2018, text: "The Thai cave rescue saves twelve boys and their soccer coach" },
    { year: 2022, text: "Russia invades Ukraine, sparking the largest European conflict in decades" },
];

// Medium: Important milestones an educated person would likely know
const MEDIUM_EVENTS = [
    { year: 1215, text: "The Magna Carta is sealed by King John of England" },
    { year: 1440, text: "Johannes Gutenberg develops the movable-type printing press" },
    { year: 1517, text: "Martin Luther posts his 95 Theses, sparking the Protestant Reformation" },
    { year: 1543, text: "Copernicus publishes his theory that the Earth revolves around the Sun" },
    { year: 1687, text: "Isaac Newton publishes his Principia Mathematica" },
    { year: 1796, text: "Edward Jenner develops the first successful smallpox vaccine" },
    { year: 1804, text: "Napoleon Bonaparte crowns himself Emperor of France" },
    { year: 1815, text: "Napoleon is defeated at the Battle of Waterloo" },
    { year: 1848, text: "Karl Marx and Friedrich Engels publish The Communist Manifesto" },
    { year: 1859, text: "Charles Darwin publishes On the Origin of Species" },
    { year: 1869, text: "The Suez Canal opens, connecting the Mediterranean and Red Seas" },
    { year: 1879, text: "Thomas Edison demonstrates the first practical incandescent light bulb" },
    { year: 1905, text: "Albert Einstein publishes his special theory of relativity" },
    { year: 1917, text: "The Russian Revolution overthrows the Tsarist autocracy" },
    { year: 1928, text: "Alexander Fleming discovers penicillin" },
    { year: 1948, text: "The State of Israel is established" },
    { year: 1961, text: "Yuri Gagarin becomes the first human in space" },
    { year: 1975, text: "The Vietnam War ends with the fall of Saigon" },
    { year: 1986, text: "The Chernobyl nuclear disaster occurs in Ukraine" },
    { year: 1990, text: "Tim Berners-Lee creates the World Wide Web" },
    { year: 2003, text: "The Human Genome Project is completed" },
    { year: 2012, text: "The Higgs boson particle is discovered at CERN" },
    { year: 1833, text: "Slavery is abolished throughout the British Empire" },
    { year: 1588, text: "The English Navy defeats the Spanish Armada" },
    { year: 1564, text: "William Shakespeare is born in Stratford-upon-Avon" },
];

// Hard: Obscure events that only history buffs would know
const HARD_EVENTS = [
    { year: 776, text: "The first recorded Olympic Games are held in Olympia, Greece" },
    { year: 1054, text: "The Great Schism splits Christianity into Roman Catholic and Eastern Orthodox" },
    { year: 1347, text: "The Black Death arrives in Europe via Genoese trading ships" },
    { year: 1453, text: "Constantinople falls to the Ottoman Turks, ending the Byzantine Empire" },
    { year: 1519, text: "Ferdinand Magellan begins the first circumnavigation of the Earth" },
    { year: 1607, text: "Jamestown, the first permanent English settlement in America, is founded" },
    { year: 1610, text: "Galileo observes the moons of Jupiter through his telescope" },
    { year: 1648, text: "The Treaty of Westphalia ends the Thirty Years' War in Europe" },
    { year: 1707, text: "The Acts of Union unite England and Scotland into Great Britain" },
    { year: 1752, text: "Benjamin Franklin demonstrates that lightning is electrical" },
    { year: 1804, text: "Haiti declares independence, becoming the first free Black republic" },
    { year: 1826, text: "Joseph Nicéphore Niépce captures the earliest surviving photograph" },
    { year: 1854, text: "Florence Nightingale begins nursing soldiers during the Crimean War" },
    { year: 1884, text: "The Berlin Conference divides Africa among European colonial powers" },
    { year: 1885, text: "Karl Benz builds the first true automobile powered by gasoline" },
    { year: 1893, text: "New Zealand becomes the first country to grant women the right to vote" },
    { year: 1895, text: "The Lumière brothers hold the first public film screening in Paris" },
    { year: 1898, text: "Marie Curie discovers the radioactive elements polonium and radium" },
    { year: 1920, text: "The 19th Amendment grants American women the right to vote" },
    { year: 1923, text: "Hyperinflation devastates the Weimar Republic's economy" },
    { year: 1937, text: "Amelia Earhart disappears over the Pacific Ocean during a flight" },
    { year: 1944, text: "The Bretton Woods Conference establishes the World Bank and IMF" },
    { year: 1956, text: "The Suez Crisis erupts as Britain, France, and Israel invade Egypt" },
    { year: 1971, text: "Nixon ends the gold standard, transforming the global monetary system" },
    { year: 1973, text: "The first mobile phone call is made by Martin Cooper of Motorola" },
    { year: 1981, text: "IBM releases its first personal computer, the IBM 5150" },
    { year: 1997, text: "Dolly the sheep, the first cloned mammal, is revealed to the public" },
    { year: 2008, text: "The collapse of Lehman Brothers triggers the global financial crisis" },
    { year: 2011, text: "The Arab Spring wave of protests sweeps across the Middle East" },
    { year: 2016, text: "AlphaGo defeats world champion Go player Lee Sedol" },
];

const EVENT_POOLS = { easy: EASY_EVENTS, medium: MEDIUM_EVENTS, hard: HARD_EVENTS };

// ============ Topic Category Pools ============
const CATEGORY_POOLS = {
    presidents: {
        name: "US Presidents",
        events: [
            { year: 1789, text: "George Washington is inaugurated as the first US President" },
            { year: 1801, text: "Thomas Jefferson becomes the third President" },
            { year: 1809, text: "James Madison takes office as the fourth President" },
            { year: 1829, text: "Andrew Jackson is inaugurated, ushering in populist politics" },
            { year: 1841, text: "William Henry Harrison dies just 31 days into his presidency" },
            { year: 1861, text: "Abraham Lincoln takes office on the eve of the Civil War" },
            { year: 1865, text: "Abraham Lincoln is assassinated at Ford's Theatre" },
            { year: 1901, text: "Theodore Roosevelt becomes President after McKinley's assassination" },
            { year: 1913, text: "Woodrow Wilson is inaugurated as the 28th President" },
            { year: 1933, text: "Franklin D. Roosevelt takes office during the Great Depression" },
            { year: 1945, text: "Harry Truman becomes President after FDR's death" },
            { year: 1953, text: "Dwight D. Eisenhower is inaugurated as President" },
            { year: 1961, text: "John F. Kennedy delivers his famous inaugural address" },
            { year: 1963, text: "John F. Kennedy is assassinated in Dallas, Texas" },
            { year: 1969, text: "Richard Nixon is inaugurated as the 37th President" },
            { year: 1974, text: "Richard Nixon resigns over the Watergate scandal" },
            { year: 1977, text: "Jimmy Carter is inaugurated as the 39th President" },
            { year: 1981, text: "Ronald Reagan is inaugurated as the 40th President" },
            { year: 1989, text: "George H.W. Bush takes office as the 41st President" },
            { year: 1993, text: "Bill Clinton is inaugurated as the 42nd President" },
            { year: 2001, text: "George W. Bush is inaugurated as the 43rd President" },
            { year: 2009, text: "Barack Obama becomes the first Black President of the United States" },
            { year: 2017, text: "Donald Trump is inaugurated as the 45th President" },
            { year: 2021, text: "Joe Biden is inaugurated as the 46th President" },
            { year: 1803, text: "Thomas Jefferson completes the Louisiana Purchase" },
        ],
    },
    space: {
        name: "Space Exploration",
        events: [
            { year: 1957, text: "The Soviet Union launches Sputnik, the first artificial satellite" },
            { year: 1958, text: "NASA is established by the United States" },
            { year: 1961, text: "Yuri Gagarin becomes the first human in space" },
            { year: 1962, text: "John Glenn becomes the first American to orbit the Earth" },
            { year: 1965, text: "Alexei Leonov performs the first spacewalk" },
            { year: 1966, text: "The Soviet Luna 9 makes the first soft landing on the Moon" },
            { year: 1969, text: "Neil Armstrong and Buzz Aldrin walk on the Moon" },
            { year: 1970, text: "Apollo 13 suffers an explosion but crew returns safely" },
            { year: 1971, text: "The Soviet Union launches Salyut 1, the first space station" },
            { year: 1973, text: "NASA launches Skylab, America's first space station" },
            { year: 1976, text: "Viking 1 lands on Mars and sends back the first surface photos" },
            { year: 1977, text: "Voyager 1 and Voyager 2 are launched toward the outer planets" },
            { year: 1981, text: "The Space Shuttle Columbia makes its first flight" },
            { year: 1986, text: "The Space Shuttle Challenger breaks apart after launch" },
            { year: 1990, text: "The Hubble Space Telescope is launched into orbit" },
            { year: 1998, text: "Construction of the International Space Station begins" },
            { year: 2003, text: "The Space Shuttle Columbia disintegrates during re-entry" },
            { year: 2004, text: "SpaceShipOne wins the X Prize for private spaceflight" },
            { year: 2006, text: "Pluto is reclassified as a dwarf planet" },
            { year: 2011, text: "The Space Shuttle program ends with Atlantis's final mission" },
            { year: 2012, text: "The Curiosity rover lands on Mars" },
            { year: 2015, text: "New Horizons flies by Pluto, sending back detailed images" },
            { year: 2020, text: "SpaceX Crew Dragon carries astronauts to the ISS" },
            { year: 2021, text: "The James Webb Space Telescope is launched" },
            { year: 1996, text: "NASA announces possible evidence of life in a Martian meteorite" },
        ],
    },
    videogames: {
        name: "Video Games",
        events: [
            { year: 1972, text: "Pong is released, becoming the first major arcade hit" },
            { year: 1977, text: "The Atari 2600 home console is released" },
            { year: 1978, text: "Space Invaders launches in arcades and becomes a phenomenon" },
            { year: 1980, text: "Pac-Man is released and becomes a cultural icon" },
            { year: 1981, text: "Donkey Kong introduces Mario for the first time" },
            { year: 1983, text: "The North American video game market crashes" },
            { year: 1985, text: "Nintendo releases the NES and Super Mario Bros." },
            { year: 1989, text: "Nintendo releases the Game Boy handheld console" },
            { year: 1991, text: "Sonic the Hedgehog debuts on the Sega Genesis" },
            { year: 1993, text: "Doom is released and popularizes the first-person shooter" },
            { year: 1994, text: "Sony launches the PlayStation console" },
            { year: 1996, text: "Nintendo 64 launches with Super Mario 64" },
            { year: 1997, text: "Final Fantasy VII is released and becomes a landmark RPG" },
            { year: 1998, text: "The Legend of Zelda: Ocarina of Time is released" },
            { year: 2000, text: "Sony releases the PlayStation 2, the best-selling console ever" },
            { year: 2001, text: "Microsoft enters gaming with the Xbox" },
            { year: 2004, text: "World of Warcraft launches and revolutionizes online gaming" },
            { year: 2006, text: "Nintendo Wii brings motion controls to the mainstream" },
            { year: 2007, text: "The first iPhone transforms mobile gaming" },
            { year: 2011, text: "Minecraft is officially released after years of development" },
            { year: 2013, text: "PlayStation 4 and Xbox One launch the eighth console generation" },
            { year: 2016, text: "Pokemon Go creates a worldwide augmented reality craze" },
            { year: 2017, text: "Nintendo Switch launches as a hybrid console" },
            { year: 2020, text: "PlayStation 5 and Xbox Series X launch the ninth generation" },
            { year: 2023, text: "The Legend of Zelda: Tears of the Kingdom is released" },
        ],
    },
    wars: {
        name: "Wars & Conflicts",
        events: [
            { year: 1066, text: "The Battle of Hastings marks the Norman conquest of England" },
            { year: 1337, text: "The Hundred Years' War begins between England and France" },
            { year: 1453, text: "Constantinople falls to the Ottoman Turks" },
            { year: 1588, text: "The English Navy defeats the Spanish Armada" },
            { year: 1776, text: "The American Revolution is formalized with the Declaration of Independence" },
            { year: 1805, text: "The Battle of Trafalgar establishes British naval supremacy" },
            { year: 1815, text: "Napoleon is defeated at the Battle of Waterloo" },
            { year: 1861, text: "The American Civil War begins at Fort Sumter" },
            { year: 1865, text: "The American Civil War ends with Lee's surrender at Appomattox" },
            { year: 1898, text: "The Spanish-American War begins" },
            { year: 1914, text: "World War I begins after the assassination of Archduke Franz Ferdinand" },
            { year: 1918, text: "World War I ends with the signing of the Armistice" },
            { year: 1939, text: "World War II begins as Germany invades Poland" },
            { year: 1941, text: "Japan attacks Pearl Harbor" },
            { year: 1944, text: "Allied forces storm the beaches of Normandy on D-Day" },
            { year: 1945, text: "World War II ends after the atomic bombings of Japan" },
            { year: 1950, text: "The Korean War begins" },
            { year: 1955, text: "The Vietnam War begins with US military advisors in South Vietnam" },
            { year: 1962, text: "The Cuban Missile Crisis brings the world to the brink of nuclear war" },
            { year: 1975, text: "The Vietnam War ends with the fall of Saigon" },
            { year: 1990, text: "Iraq invades Kuwait, triggering the Gulf War" },
            { year: 2001, text: "The US invades Afghanistan after the September 11 attacks" },
            { year: 2003, text: "The US-led invasion of Iraq begins" },
            { year: 2011, text: "The Syrian Civil War begins" },
            { year: 2022, text: "Russia invades Ukraine" },
        ],
    },
    sports: {
        name: "Sports",
        events: [
            { year: 1896, text: "The first modern Olympic Games are held in Athens" },
            { year: 1903, text: "The first Tour de France cycling race takes place" },
            { year: 1930, text: "The first FIFA World Cup is held in Uruguay" },
            { year: 1936, text: "Jesse Owens wins four gold medals at the Berlin Olympics" },
            { year: 1947, text: "Jackie Robinson breaks baseball's color barrier" },
            { year: 1954, text: "Roger Bannister runs the first sub-four-minute mile" },
            { year: 1958, text: "A 17-year-old Pele leads Brazil to the World Cup title" },
            { year: 1960, text: "Muhammad Ali wins his first Olympic gold medal" },
            { year: 1966, text: "England wins the FIFA World Cup on home soil" },
            { year: 1967, text: "The first Super Bowl is played between the NFL and AFL champions" },
            { year: 1972, text: "Mark Spitz wins seven gold medals at the Munich Olympics" },
            { year: 1974, text: "Muhammad Ali defeats George Foreman in the Rumble in the Jungle" },
            { year: 1980, text: "The US hockey team defeats the Soviets in the Miracle on Ice" },
            { year: 1984, text: "Carl Lewis wins four gold medals at the Los Angeles Olympics" },
            { year: 1992, text: "The NBA Dream Team dominates basketball at the Barcelona Olympics" },
            { year: 1995, text: "South Africa wins the Rugby World Cup, uniting the post-apartheid nation" },
            { year: 1997, text: "Tiger Woods wins the Masters at age 21" },
            { year: 2002, text: "The Winter Olympics are held in Salt Lake City" },
            { year: 2008, text: "Michael Phelps wins eight gold medals at the Beijing Olympics" },
            { year: 2009, text: "Usain Bolt sets the 100m world record at 9.58 seconds" },
            { year: 2010, text: "Spain wins its first FIFA World Cup" },
            { year: 2012, text: "The London Olympics open with a spectacular ceremony" },
            { year: 2016, text: "Leicester City wins the Premier League against 5000-to-1 odds" },
            { year: 2020, text: "The Tokyo Olympics are held a year late due to the pandemic" },
            { year: 2022, text: "Argentina wins the FIFA World Cup in Qatar" },
        ],
    },
    music: {
        name: "Music",
        events: [
            { year: 1877, text: "Thomas Edison invents the phonograph" },
            { year: 1927, text: "The first electronic television demonstration takes place" },
            { year: 1948, text: "The vinyl LP record is introduced by Columbia Records" },
            { year: 1954, text: "Elvis Presley records his first single at Sun Records" },
            { year: 1959, text: "The Day the Music Died: Buddy Holly, Ritchie Valens, and the Big Bopper die in a plane crash" },
            { year: 1962, text: "The Beatles release their first single, Love Me Do" },
            { year: 1964, text: "The Beatles appear on The Ed Sullivan Show" },
            { year: 1967, text: "The Beatles release Sgt. Pepper's Lonely Hearts Club Band" },
            { year: 1969, text: "The Woodstock music festival draws 400,000 people" },
            { year: 1973, text: "Pink Floyd releases The Dark Side of the Moon" },
            { year: 1975, text: "Queen releases Bohemian Rhapsody" },
            { year: 1977, text: "Elvis Presley dies at Graceland" },
            { year: 1979, text: "Sony introduces the Walkman portable cassette player" },
            { year: 1981, text: "MTV launches with Video Killed the Radio Star" },
            { year: 1982, text: "Michael Jackson releases Thriller, the best-selling album ever" },
            { year: 1985, text: "Live Aid concerts raise money for Ethiopian famine relief" },
            { year: 1991, text: "Nirvana releases Nevermind, launching the grunge movement" },
            { year: 1994, text: "Kurt Cobain dies at age 27" },
            { year: 1999, text: "Napster launches and disrupts the music industry" },
            { year: 2001, text: "Apple launches the iPod" },
            { year: 2003, text: "The iTunes Store opens, selling digital music" },
            { year: 2008, text: "Spotify launches in Sweden" },
            { year: 2015, text: "Adele's album 25 sells over 3 million copies in its first week" },
            { year: 2017, text: "Streaming surpasses all other forms of music consumption" },
            { year: 2020, text: "BTS becomes the first K-pop group to top the US Billboard chart" },
        ],
    },
    movies: {
        name: "Movies & TV",
        events: [
            { year: 1895, text: "The Lumiere brothers hold the first public film screening" },
            { year: 1927, text: "The Jazz Singer becomes the first major talking picture" },
            { year: 1928, text: "Walt Disney debuts Mickey Mouse in Steamboat Willie" },
            { year: 1939, text: "The Wizard of Oz and Gone with the Wind premiere" },
            { year: 1941, text: "Citizen Kane is released, later hailed as the greatest film ever" },
            { year: 1951, text: "I Love Lucy premieres and transforms television comedy" },
            { year: 1955, text: "Disneyland opens in Anaheim, California" },
            { year: 1963, text: "Doctor Who premieres on the BBC" },
            { year: 1968, text: "2001: A Space Odyssey revolutionizes science fiction cinema" },
            { year: 1972, text: "The Godfather is released and becomes a cultural landmark" },
            { year: 1975, text: "Jaws becomes the first summer blockbuster" },
            { year: 1977, text: "Star Wars is released and changes cinema forever" },
            { year: 1982, text: "E.T. the Extra-Terrestrial becomes the highest-grossing film" },
            { year: 1984, text: "The Terminator is released" },
            { year: 1989, text: "The Simpsons debuts on Fox" },
            { year: 1993, text: "Jurassic Park pioneers CGI effects in blockbuster filmmaking" },
            { year: 1994, text: "The Shawshank Redemption and Pulp Fiction are released" },
            { year: 1997, text: "Titanic becomes the highest-grossing film of all time" },
            { year: 1999, text: "The Matrix introduces bullet time to cinema" },
            { year: 2001, text: "The Lord of the Rings: The Fellowship of the Ring premieres" },
            { year: 2008, text: "The Dark Knight redefines superhero films" },
            { year: 2009, text: "Avatar breaks box office records with 3D filmmaking" },
            { year: 2013, text: "Frozen becomes Disney's highest-grossing animated film" },
            { year: 2019, text: "Avengers: Endgame becomes the highest-grossing film ever" },
            { year: 2022, text: "Top Gun: Maverick becomes a massive box office hit" },
        ],
    },
    science: {
        name: "Science & Discovery",
        events: [
            { year: 1543, text: "Copernicus publishes his theory that the Earth revolves around the Sun" },
            { year: 1610, text: "Galileo observes the moons of Jupiter through his telescope" },
            { year: 1665, text: "Isaac Newton develops his theory of gravity" },
            { year: 1687, text: "Newton publishes his Principia Mathematica" },
            { year: 1752, text: "Benjamin Franklin proves lightning is electrical" },
            { year: 1796, text: "Edward Jenner develops the first smallpox vaccine" },
            { year: 1831, text: "Michael Faraday discovers electromagnetic induction" },
            { year: 1859, text: "Charles Darwin publishes On the Origin of Species" },
            { year: 1869, text: "Dmitri Mendeleev creates the periodic table of elements" },
            { year: 1895, text: "Wilhelm Rontgen discovers X-rays" },
            { year: 1898, text: "Marie Curie discovers radium and polonium" },
            { year: 1905, text: "Albert Einstein publishes his special theory of relativity" },
            { year: 1915, text: "Einstein publishes his general theory of relativity" },
            { year: 1928, text: "Alexander Fleming discovers penicillin" },
            { year: 1938, text: "Nuclear fission is discovered" },
            { year: 1947, text: "The transistor is invented at Bell Labs" },
            { year: 1953, text: "Watson and Crick discover the structure of DNA" },
            { year: 1964, text: "The existence of the Higgs boson is theorized" },
            { year: 1969, text: "ARPANET sends its first message, laying the foundation for the internet" },
            { year: 1990, text: "Tim Berners-Lee invents the World Wide Web" },
            { year: 1996, text: "Dolly the sheep becomes the first cloned mammal" },
            { year: 2003, text: "The Human Genome Project is completed" },
            { year: 2012, text: "The Higgs boson particle is confirmed at CERN" },
            { year: 2020, text: "COVID-19 mRNA vaccines are developed in record time" },
            { year: 2022, text: "The first image from the James Webb Space Telescope is released" },
        ],
    },
    ancient: {
        name: "Ancient World",
        events: [
            { year: 3000, text: "The first Egyptian hieroglyphs are developed" },
            { year: 2560, text: "The Great Pyramid of Giza is completed" },
            { year: 1754, text: "The Code of Hammurabi is written in Babylon" },
            { year: 1333, text: "Tutankhamun becomes pharaoh of Egypt at age nine" },
            { year: 776, text: "The first recorded Olympic Games are held in Greece" },
            { year: 753, text: "Rome is traditionally said to have been founded" },
            { year: 509, text: "The Roman Republic is established" },
            { year: 490, text: "The Greeks defeat the Persians at the Battle of Marathon" },
            { year: 447, text: "Construction of the Parthenon begins in Athens" },
            { year: 336, text: "Alexander the Great becomes King of Macedon" },
            { year: 323, text: "Alexander the Great dies in Babylon at age 32" },
            { year: 221, text: "Qin Shi Huang unifies China and begins the Great Wall" },
            { year: 218, text: "Hannibal crosses the Alps with war elephants to attack Rome" },
            { year: 146, text: "Rome destroys Carthage, ending the Punic Wars" },
            { year: 44, text: "Julius Caesar is assassinated on the Ides of March" },
            { year: 27, text: "Augustus becomes the first Roman Emperor" },
            { year: 79, text: "Mount Vesuvius erupts and buries the city of Pompeii" },
            { year: 117, text: "The Roman Empire reaches its greatest territorial extent" },
            { year: 313, text: "Emperor Constantine legalizes Christianity in the Roman Empire" },
            { year: 330, text: "Constantinople is founded as the new Roman capital" },
            { year: 410, text: "The Visigoths sack Rome" },
            { year: 476, text: "The Western Roman Empire falls" },
            { year: 622, text: "The Prophet Muhammad migrates to Medina" },
            { year: 800, text: "Charlemagne is crowned Emperor of the Romans" },
            { year: 1066, text: "William the Conqueror wins the Battle of Hastings" },
        ],
    },
    food: {
        name: "Food & Drink",
        events: [
            { year: 1502, text: "Columbus encounters cocoa beans in the Americas" },
            { year: 1615, text: "Coffee becomes popular in Venice, Italy" },
            { year: 1652, text: "The first coffeehouse opens in London" },
            { year: 1765, text: "The sandwich is invented by the Earl of Sandwich" },
            { year: 1795, text: "Nicolas Appert develops food preservation using sealed jars" },
            { year: 1830, text: "The first modern restaurant guide is published in Paris" },
            { year: 1853, text: "Potato chips are invented in Saratoga Springs, New York" },
            { year: 1856, text: "Gail Borden patents condensed milk" },
            { year: 1876, text: "Heinz introduces bottled ketchup" },
            { year: 1886, text: "Coca-Cola is first served at a pharmacy in Atlanta" },
            { year: 1891, text: "The first electric oven is patented" },
            { year: 1904, text: "The ice cream cone is popularized at the St. Louis World's Fair" },
            { year: 1906, text: "The US Pure Food and Drug Act is passed" },
            { year: 1920, text: "Prohibition bans alcohol in the United States" },
            { year: 1928, text: "Sliced bread is sold for the first time" },
            { year: 1937, text: "Spam canned meat is introduced by Hormel" },
            { year: 1940, text: "The first McDonald's restaurant opens in San Bernardino" },
            { year: 1946, text: "The first microwave oven is sold commercially" },
            { year: 1952, text: "The first Kentucky Fried Chicken franchise opens" },
            { year: 1958, text: "Instant ramen noodles are invented in Japan" },
            { year: 1961, text: "Julia Child premieres her cooking show on American television" },
            { year: 1971, text: "The first Starbucks opens in Seattle" },
            { year: 1983, text: "The first Diet Coke is sold" },
            { year: 1994, text: "Amazon starts as an online bookstore, later transforming food delivery" },
            { year: 2004, text: "Super Size Me documentary changes fast food conversations" },
        ],
    },
};

// ============ Wikipedia Service ============
const WikipediaService = {
    getRandomDates(count) {
        const dates = [];
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        for (let i = 0; i < count; i++) {
            const month = Math.floor(Math.random() * 12) + 1;
            const maxDay = daysInMonth[month - 1];
            const day = Math.floor(Math.random() * maxDay) + 1;
            dates.push({ month, day });
        }
        return dates;
    },

    async fetchEventsForDate(month, day) {
        const mm = String(month).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return (data.events || []).map(e => ({
            year: e.year,
            text: e.text,
            pageCount: (e.pages || []).length
        }));
    },

    async fetchEvents(difficulty, statusCallback) {
        const dates = this.getRandomDates(10);
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Fetch in parallel
        const promises = dates.map(async ({ month, day }) => {
            if (statusCallback) {
                statusCallback(`Searching ${monthNames[month - 1]} ${day}...`);
            }
            try {
                return await this.fetchEventsForDate(month, day);
            } catch {
                return [];
            }
        });

        const results = await Promise.all(promises);
        let allEvents = results.flat();

        // Base filtering
        allEvents = allEvents
            .filter(e => e.year && e.text)
            .filter(e => e.year > 0 && e.year <= 2024)
            .filter(e => e.text.length > 20 && e.text.length < 200);

        // Difficulty-based filtering using page count as a notability proxy
        // More linked Wikipedia pages = more notable = easier to know
        let filtered;
        if (difficulty === 'easy') {
            // High notability: many linked pages, well-known
            filtered = allEvents.filter(e => e.pageCount >= 4);
        } else if (difficulty === 'medium') {
            // Moderate notability
            filtered = allEvents.filter(e => e.pageCount >= 2 && e.pageCount <= 5);
        } else {
            // Low notability: fewer linked pages, more obscure
            filtered = allEvents.filter(e => e.pageCount <= 2);
        }

        // If filtering was too aggressive, relax it
        if (filtered.length < 15) {
            filtered = allEvents;
        }

        // Deduplicate by year (keep one per year for cleaner gameplay)
        const byYear = new Map();
        for (const event of filtered) {
            if (!byYear.has(event.year) || event.text.length < byYear.get(event.year).text.length) {
                byYear.set(event.year, event);
            }
        }
        const unique = Array.from(byYear.values());

        return this.selectDiverse(unique, EVENTS_PER_GAME);
    },

    selectDiverse(events, count) {
        if (events.length <= count) return this.shuffle(events);

        // Bucket by century
        const buckets = new Map();
        for (const event of events) {
            const century = Math.floor(event.year / 100);
            if (!buckets.has(century)) buckets.set(century, []);
            buckets.get(century).push(event);
        }

        for (const [, bucket] of buckets) {
            this.shuffleInPlace(bucket);
        }

        // Round-robin pick from centuries for variety
        const selected = [];
        const centuries = Array.from(buckets.keys()).sort((a, b) => a - b);
        let idx = 0;
        while (selected.length < count) {
            const century = centuries[idx % centuries.length];
            const bucket = buckets.get(century);
            if (bucket.length > 0) {
                selected.push(bucket.pop());
            } else {
                centuries.splice(idx % centuries.length, 1);
                if (centuries.length === 0) break;
                continue;
            }
            idx++;
        }

        return this.shuffle(selected);
    },

    shuffle(arr) {
        const a = [...arr];
        this.shuffleInPlace(a);
        return a;
    },

    shuffleInPlace(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
};

// ============ Game State ============
class Game {
    constructor() {
        this.reset();
    }

    reset() {
        this.timeline = [];
        this.deck = [];
        this.currentCard = null;
        this.lives = MAX_LIVES;
        this.score = 0;
        this.difficulty = 'easy';
        this.endless = false;
        this.allEvents = [];
        this.topicName = null;
    }

    init(events, difficulty) {
        this.reset();
        this.difficulty = difficulty;
        const shuffled = WikipediaService.shuffle(events);

        // Seed the timeline with the first event
        this.timeline = [shuffled[0]];

        // Rest goes to the deck
        this.deck = shuffled.slice(1);

        // Draw first card
        this.currentCard = this.deck.pop();
    }

    isCorrectPosition(position) {
        const year = this.currentCard.year;
        const before = position > 0 ? this.timeline[position - 1] : null;
        const after = position < this.timeline.length ? this.timeline[position] : null;

        if (before && year < before.year) return false;
        if (after && year > after.year) return false;
        return true;
    }

    getCorrectPosition(year) {
        for (let i = 0; i < this.timeline.length; i++) {
            if (year <= this.timeline[i].year) return i;
        }
        return this.timeline.length;
    }

    placeCard(position) {
        const card = this.currentCard;
        const correct = this.isCorrectPosition(position);

        if (correct) {
            this.score++;
        } else {
            this.lives--;
        }

        // Always insert at the correct sorted position
        const correctPos = this.getCorrectPosition(card.year);
        this.timeline.splice(correctPos, 0, card);

        // Draw next card
        this.currentCard = this.deck.length > 0 ? this.deck.pop() : null;

        return {
            correct,
            event: card,
            insertedAt: correctPos,
            chosenPosition: position
        };
    }

    get isGameOver() {
        if (this.endless) return this.lives <= 0;
        return this.lives <= 0 || this.currentCard === null;
    }

    get isWin() {
        if (this.endless) return false; // endless never wins
        return this.lives > 0 && this.currentCard === null;
    }

    get isDeckEmpty() {
        return this.currentCard === null && this.deck.length === 0;
    }
}

// ============ UI Controller ============
class GameUI {
    constructor() {
        this.game = new Game();
        this.isAnimating = false;
        this.dadMode = localStorage.getItem('dadMode') === 'true';
        this.bindElements();
        this.bindEvents();
        if (this.dadMode) document.body.classList.add('dad-mode');
    }

    bindElements() {
        this.screens = {
            start: document.getElementById('screen-start'),
            loading: document.getElementById('screen-loading'),
            game: document.getElementById('screen-game'),
            gameover: document.getElementById('screen-gameover'),
        };
        this.scoreEl = document.getElementById('score');
        this.remainingEl = document.getElementById('remaining');
        this.livesEl = document.getElementById('lives');
        this.currentCardEl = document.getElementById('current-card');
        this.currentTextEl = document.getElementById('current-event-text');
        this.timelineEl = document.getElementById('timeline');
        this.toastEl = document.getElementById('feedback-toast');
        this.instructionEl = document.getElementById('instruction');
        this.loadingStatus = document.getElementById('loading-status');
        this.finalScoreEl = document.getElementById('final-score');
        this.finalTimelineEl = document.getElementById('final-timeline');
        this.gameoverTitleEl = document.getElementById('gameover-title');
        this.gameoverIconEl = document.getElementById('gameover-icon');
        this.gameoverMsgEl = document.getElementById('gameover-message');
        this.dadTooltipEl = document.getElementById('dad-tooltip');
        this.readClueBtn = document.getElementById('btn-read-clue');
    }

    bindEvents() {
        // Event count slider
        const slider = document.getElementById('event-count');
        const display = document.getElementById('event-count-display');
        slider.addEventListener('input', () => {
            display.textContent = slider.value;
        });

        // Difficulty buttons on the start screen
        document.querySelectorAll('.btn-difficulty').forEach(btn => {
            btn.addEventListener('click', () => {
                const difficulty = btn.dataset.difficulty;
                this.startGame(difficulty);
            });
        });

        // Category topic buttons
        document.querySelectorAll('.btn-category').forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.startCategoryGame(category);
            });
        });

        // Endless mode button
        document.getElementById('btn-endless').addEventListener('click', () => {
            this.startEndlessGame();
        });

        // Main menu buttons (game screen and game over screen)
        document.getElementById('btn-menu-game').addEventListener('click', () => {
            this.showScreen('start');
        });
        document.getElementById('btn-menu-gameover').addEventListener('click', () => {
            this.showScreen('start');
        });

        // Reset events button (endless mode)
        document.getElementById('btn-reset-events').addEventListener('click', () => {
            this.resetEndlessEvents();
        });

        document.getElementById('btn-replay').addEventListener('click', () => {
            this.showScreen('start');
        });

        // Dad mode toggle
        const dadToggle = document.getElementById('dad-mode-toggle');
        dadToggle.checked = this.dadMode;
        dadToggle.addEventListener('change', () => {
            this.dadMode = dadToggle.checked;
            localStorage.setItem('dadMode', this.dadMode);
            document.body.classList.toggle('dad-mode', this.dadMode);
            if (!this.dadMode) this.hideDadTooltip();
        });

        // Read clue button
        this.readClueBtn.addEventListener('click', () => this.readClue());

        // Dad mode tooltip — event delegation on the timeline container
        this.timelineEl.addEventListener('mouseover', (e) => {
            if (!this.dadMode) return;
            const card = e.target.closest('.timeline-card');
            if (!card) return;
            this.showDadTooltip(card);
        });
        this.timelineEl.addEventListener('mouseout', (e) => {
            if (!this.dadMode) return;
            const card = e.target.closest('.timeline-card');
            if (!card) return;
            // Only hide if the pointer is leaving to something outside any timeline card
            if (!e.relatedTarget || !e.relatedTarget.closest('.timeline-card')) {
                this.hideDadTooltip();
            }
        });
    }

    showDadTooltip(cardEl) {
        const year = cardEl.dataset.year || '';
        const text = cardEl.dataset.text || cardEl.querySelector('.timeline-text')?.textContent || '';
        const rect = cardEl.getBoundingClientRect();

        this.dadTooltipEl.innerHTML = `
            <div class="dad-tooltip-inner">
                <div class="dad-tooltip-year">${year}</div>
                <div class="dad-tooltip-text">${text}</div>
            </div>
        `;

        const tooltipWidth = 260;
        // Center horizontally over the card, clamped to viewport
        let left = rect.left + rect.width / 2 - tooltipWidth / 2;
        left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
        this.dadTooltipEl.style.left = `${left}px`;
        this.dadTooltipEl.style.top = `${rect.top}px`; // temporary

        this.dadTooltipEl.classList.add('show');

        // Reposition after layout so we know the tooltip height
        requestAnimationFrame(() => {
            const h = this.dadTooltipEl.offsetHeight;
            const above = rect.top - h - 14;
            if (above >= 8) {
                this.dadTooltipEl.style.top = `${above}px`;
            } else {
                // Not enough room above — show below
                this.dadTooltipEl.style.top = `${rect.bottom + 14}px`;
            }
        });
    }

    hideDadTooltip() {
        this.dadTooltipEl.classList.remove('show');
    }

    readClue() {
        if (!window.speechSynthesis) return;

        // If already speaking, stop and reset button
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            this.readClueBtn.classList.remove('speaking');
            return;
        }

        const text = this.game.currentCard?.text;
        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        this.readClueBtn.classList.add('speaking');
        utterance.onend = () => this.readClueBtn.classList.remove('speaking');
        utterance.onerror = () => this.readClueBtn.classList.remove('speaking');
        window.speechSynthesis.speak(utterance);
    }

    stopSpeech() {
        if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
        this.readClueBtn?.classList.remove('speaking');
    }

    showScreen(name) {
        for (const [key, el] of Object.entries(this.screens)) {
            el.classList.toggle('active', key === name);
        }
    }

    getEventCount() {
        return parseInt(document.getElementById('event-count').value) || EVENTS_PER_GAME;
    }

    async startGame(difficulty) {
        const count = this.getEventCount();
        this.showScreen('loading');

        const curated = WikipediaService.shuffle(EVENT_POOLS[difficulty] || EASY_EVENTS);

        let wikiEvents = [];
        if (difficulty === 'hard' || difficulty === 'medium') {
            try {
                wikiEvents = await WikipediaService.fetchEvents(difficulty, (status) => {
                    this.loadingStatus.textContent = status;
                });
            } catch {
                wikiEvents = [];
            }
        }

        let events;
        if (difficulty === 'easy') {
            this.loadingStatus.textContent = 'Preparing well-known events...';
            events = curated.slice(0, count);
        } else if (difficulty === 'medium') {
            const curatedYears = new Set(curated.map(e => e.year));
            const wikiFiltered = wikiEvents.filter(e => !curatedYears.has(e.year));
            events = [...curated, ...WikipediaService.shuffle(wikiFiltered)]
                .slice(0, count);
        } else {
            if (wikiEvents.length >= 12) {
                const wikiYears = new Set(wikiEvents.map(e => e.year));
                const curatedFiltered = curated.filter(e => !wikiYears.has(e.year));
                events = [...wikiEvents, ...WikipediaService.shuffle(curatedFiltered)]
                    .slice(0, count);
            } else {
                events = curated.slice(0, count);
            }
        }

        this.game.init(events, difficulty);
        this.showScreen('game');
        this.renderAll();
    }

    startCategoryGame(categoryKey) {
        const count = this.getEventCount();
        const category = CATEGORY_POOLS[categoryKey];
        if (!category) return;

        const events = WikipediaService.shuffle(category.events).slice(0, count);
        this.game.init(events, 'category');
        this.game.topicName = category.name;
        this.showScreen('game');
        this.renderAll();
    }

    startEndlessGame() {
        // Collect ALL events from every pool
        const all = [
            ...EASY_EVENTS,
            ...MEDIUM_EVENTS,
            ...HARD_EVENTS,
        ];
        for (const cat of Object.values(CATEGORY_POOLS)) {
            all.push(...cat.events);
        }

        // Deduplicate by year+text (keep first seen)
        const seen = new Set();
        const unique = [];
        for (const e of all) {
            const key = `${e.year}|${e.text}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(e);
            }
        }

        const shuffled = WikipediaService.shuffle(unique);
        this.game.init(shuffled, 'endless');
        this.game.endless = true;
        this.game.allEvents = unique; // keep full pool for resets
        this.game.topicName = 'Endless';

        // Hide reset button at start
        document.getElementById('btn-reset-events').classList.add('hidden');

        this.showScreen('game');
        this.renderAll();
    }

    resetEndlessEvents() {
        if (!this.game.endless) return;

        // Get years already on the timeline
        const timelineYears = new Set(this.game.timeline.map(e => e.year));

        // Filter out events whose year is already on the timeline
        const available = this.game.allEvents.filter(e => !timelineYears.has(e.year));

        if (available.length === 0) return; // no more events possible

        // Shuffle and refill deck
        const shuffled = WikipediaService.shuffle(available);
        this.game.deck = shuffled.slice(1);
        this.game.currentCard = shuffled[0];

        // Hide reset button, show card again
        document.getElementById('btn-reset-events').classList.add('hidden');
        this.currentCardEl.classList.remove('hidden');

        this.renderAll();
    }

    renderAll() {
        this.renderScore();
        this.renderRemaining();
        this.renderLives();
        this.renderCurrentCard();
        this.renderTimeline();
    }

    renderScore() {
        this.scoreEl.textContent = this.game.score;
    }

    renderRemaining() {
        this.remainingEl.textContent = this.game.deck.length;
    }

    renderLives() {
        let html = '';
        for (let i = 0; i < MAX_LIVES; i++) {
            const lost = i >= this.game.lives;
            html += `<span class="life ${lost ? 'lost' : ''}">⏳</span>`;
        }
        this.livesEl.innerHTML = html;
    }

    renderCurrentCard() {
        const card = this.game.currentCard;
        if (!card) return;

        this.stopSpeech();
        this.currentCardEl.classList.remove('hidden');
        this.currentTextEl.textContent = card.text;
        this.currentCardEl.style.animation = 'none';
        this.currentCardEl.offsetHeight; // reflow
        this.currentCardEl.style.animation = 'fadeInUp 0.4s ease';
    }

    renderTimeline() {
        this.timelineEl.innerHTML = '';
        const timeline = this.game.timeline;

        for (let i = 0; i <= timeline.length; i++) {
            // Drop zone
            const dz = document.createElement('button');
            dz.className = 'drop-zone';
            dz.innerHTML = '<span class="drop-icon">+</span>';
            dz.setAttribute('aria-label', `Place event at position ${i}`);
            const pos = i;
            dz.addEventListener('click', () => this.handlePlace(pos));
            this.timelineEl.appendChild(dz);

            // Event card
            if (i < timeline.length) {
                const event = timeline[i];
                const card = document.createElement('div');
                card.className = 'timeline-card';
                card.id = `tcard-${i}`;
                card.dataset.year = event.year;
                card.dataset.text = event.text; // full untruncated text for dad tooltip
                card.innerHTML = `
                    <div class="timeline-year">${event.year}</div>
                    <div class="timeline-text">${this.truncate(event.text, 80)}</div>
                `;
                this.timelineEl.appendChild(card);
            }
        }

        // Scroll to center
        requestAnimationFrame(() => {
            const scroll = this.timelineEl.closest('.timeline-scroll');
            if (scroll) {
                scroll.scrollLeft = (scroll.scrollWidth - scroll.clientWidth) / 2;
            }
        });
    }

    handlePlace(position) {
        if (this.isAnimating || this.game.isGameOver) return;
        this.isAnimating = true;

        const result = this.game.placeCard(position);

        // Re-render timeline with the new card highlighted
        this.renderTimeline();

        const insertedCard = document.getElementById(`tcard-${result.insertedAt}`);
        if (insertedCard) {
            insertedCard.classList.add('just-placed');
            insertedCard.classList.add(result.correct ? 'correct' : 'wrong');

            requestAnimationFrame(() => {
                insertedCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            });
        }

        this.showToast(result);
        this.renderScore();
        this.renderRemaining();
        this.renderLives();

        setTimeout(() => {
            if (insertedCard) {
                insertedCard.classList.remove('correct', 'wrong');
            }

            if (this.game.isGameOver) {
                this.showGameOver();
            } else if (this.game.endless && this.game.isDeckEmpty) {
                // Endless mode: deck ran out, show reset button
                this.currentCardEl.classList.add('hidden');
                document.getElementById('btn-reset-events').classList.remove('hidden');
            } else {
                this.renderCurrentCard();
            }
            this.isAnimating = false;
        }, 1500);
    }

    showToast(result) {
        const { correct, event } = result;
        this.toastEl.className = `feedback-toast ${correct ? 'correct' : 'wrong'} show`;

        if (correct) {
            this.toastEl.textContent = `✓ Correct! (${event.year})`;
        } else {
            this.toastEl.textContent = `✗ Nope — that was ${event.year}`;
        }

        setTimeout(() => {
            this.toastEl.classList.remove('show');
        }, 1200);
    }

    showGameOver() {
        this.stopSpeech();
        const isWin = this.game.isWin;
        const diff = this.game.difficulty;
        const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1);

        if (isWin) {
            this.gameoverIconEl.textContent = '🏆';
            this.gameoverTitleEl.textContent = 'YOU WIN!';
        } else {
            this.gameoverIconEl.textContent = '⏰';
            this.gameoverTitleEl.textContent = 'TIMED OUT!';
        }

        this.gameoverMsgEl.textContent = this.getGameOverMessage(this.game.score, isWin, diff);
        this.finalScoreEl.textContent = this.game.score;

        // Render the final timeline
        this.finalTimelineEl.innerHTML = '';
        for (const event of this.game.timeline) {
            const card = document.createElement('div');
            card.className = 'mini-card';
            card.innerHTML = `
                <div class="mini-year">${event.year}</div>
                <div class="mini-text">${this.truncate(event.text, 50)}</div>
            `;
            this.finalTimelineEl.appendChild(card);
        }

        setTimeout(() => {
            this.showScreen('gameover');
        }, 600);
    }

    getGameOverMessage(score, isWin, difficulty) {
        const topicName = this.game.topicName;
        if (isWin) {
            if (difficulty === 'category') return `Perfect! You nailed every "${topicName}" event!`;
            if (difficulty === 'hard') return "Incredible! You mastered the hardest events!";
            if (difficulty === 'medium') return "Impressive — you nailed every event!";
            return "Perfect run! Ready for a harder challenge?";
        }
        if (difficulty === 'endless') {
            if (score <= 5) return "The timeline is infinite — give it another go!";
            if (score <= 15) return "Solid run through the ages!";
            if (score <= 30) return "You're a walking history encyclopedia!";
            return `Legendary! ${score} events placed in endless mode!`;
        }
        if (difficulty === 'category') {
            if (score <= 2) return `"${topicName}" is trickier than you thought!`;
            if (score <= 5) return `Not bad for "${topicName}"! Give it another shot.`;
            return `Impressive "${topicName}" knowledge!`;
        }
        if (score <= 2) return "History is full of surprises — try again!";
        if (score <= 5) return "Not bad! You've got some historical sense.";
        if (score <= 10) return "Great job! You really know your history.";
        return "Amazing! You're practically a time traveler!";
    }

    truncate(text, maxLen) {
        if (text.length <= maxLen) return text;
        return text.substring(0, maxLen).replace(/\s+\S*$/, '') + '…';
    }
}

// ============ Initialize ============
document.addEventListener('DOMContentLoaded', () => {
    new GameUI();
});
