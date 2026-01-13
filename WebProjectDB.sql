CREATE DATABASE WebProject;
USE WebProject;

CREATE TABLE kathigitis
(
username VARCHAR(15) PRIMARY KEY,
pass_word VARCHAR(30) NOT NULL, 
profession ENUM ('TEE','DEP','EEP','EDIP','ETEP') NOT NULL,
email VARCHAR(30) NOT NULL UNIQUE CHECK (email LIKE '%@ceid.upatras.gr'),
onoma VARCHAR (15) NOT NULL,
eponimo VARCHAR (15) NOT NULL,
tilefono VARCHAR(10) NOT NULL
);


ALTER TABLE kathigitis
ADD CONSTRAINT chk_tilefono_digits
CHECK (tilefono REGEXP '^[0-9]{10}$');


CREATE TABLE foititis
(
am INT(7) PRIMARY KEY,
username VARCHAR(9) UNIQUE,
pass_word VARCHAR(30) NOT NULL,
onoma VARCHAR(15) NOT NULL,
eponimo VARCHAR(30) NOT NULL,
etos INT(4) NOT NULL,
email VARCHAR(30) NOT NULL UNIQUE CHECK (email LIKE '%@ceid.upatras.gr'),
kinito VARCHAR(10) NOT NULL,
stathero VARCHAR(10),
dieuthinsi VARCHAR (30) NOT NULL,
CHECK (username LIKE 'up%')
);


ALTER TABLE foititis
ADD CONSTRAINT chk_kinito_digits
CHECK (kinito REGEXP '^[0-9]{10}$'),
ADD CONSTRAINT chk_stathero_digits
CHECK (stathero REGEXP '^[0-9]{10}$');


CREATE TABLE grammateia
(
username VARCHAR(15) PRIMARY KEY,
pass_word VARCHAR(30) NOT NULL,
tilefono VARCHAR(10) NOT NULL,
email VARCHAR(30),
onoma VARCHAR(15),
eponimo VARCHAR(15)
);


ALTER TABLE grammateia
ADD CONSTRAINT chk_gram_tilefono_digits
CHECK (tilefono REGEXP '^[0-9]{10}$');


CREATE TABLE diplomatiki
(
id INT AUTO_INCREMENT PRIMARY KEY,
titlos VARCHAR (50) NOT NULL,
perigrafi VARCHAR (100) NOT NULL,
arxeio_perigrafis VARCHAR (60) NOT NULL,
simeiosis VARCHAR(300) DEFAULT NULL,
status_diplomatiki ENUM ('Does not meet requirements','Accepted','Under exam','Finished') DEFAULT 'Does not meet requirements',
switch ENUM ('True','False') DEFAULT ('False'),
epivlepontas VARCHAR(15) NOT NULL,
noumero1 VARCHAR(15),
noumero2 VARCHAR (15) ,
simeioseis_epivlepontas VARCHAR (250),
simeioseis_noumero1 VARCHAR (250),
simeioseis_noumero2 VARCHAR (250),
nimertis VARCHAR(150),
gs_anathesi INT(10),
FOREIGN KEY (epivlepontas)
REFERENCES kathigitis (username)
ON DELETE CASCADE ON UPDATE CASCADE,
FOREIGN KEY (noumero1)
REFERENCES kathigitis (username)
ON DELETE CASCADE ON UPDATE CASCADE,
FOREIGN KEY (noumero2)
REFERENCES kathigitis (username)
ON DELETE CASCADE ON UPDATE CASCADE,
INDEX (status_diplomatiki)
);


CREATE TABLE diplomatiki_grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  diplomatiki_id INT NOT NULL,
  grader_role ENUM('epivlepontas','noumero1','noumero2') NOT NULL,
  grader_username VARCHAR(15) NOT NULL,
  grade1 DECIMAL(3,1) NULL,
  grade2 DECIMAL(3,1) NULL,
  grade3 DECIMAL(3,1) NULL,
  grade4 DECIMAL(3,1) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dipl_grader (diplomatiki_id, grader_role),
  INDEX idx_dipl (diplomatiki_id),
  CONSTRAINT fk_dg_dipl FOREIGN KEY (diplomatiki_id) REFERENCES diplomatiki(id) ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE aitisi(
katastasi ENUM ('Pending','Rejected','Accepted') NOT NULL,
foititis VARCHAR(9) NOT NULL,
kathigitis VARCHAR(15) NOT NULL,
diplomatiki INT NOT NULL,
imerominia_prosklisis TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
imerominia_apantisis DATE DEFAULT NULL,
FOREIGN KEY (foititis)
REFERENCES foititis(username)
ON DELETE CASCADE ON UPDATE CASCADE,
FOREIGN KEY (kathigitis)
REFERENCES kathigitis(username)
ON DELETE CASCADE ON UPDATE CASCADE,
FOREIGN KEY (diplomatiki)
REFERENCES diplomatiki (id)
ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE analamvanei(
foititis VARCHAR(9) NOT NULL,
diplomatiki INT NOT NULL,
imerominia_enarxis TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
imerominia_lixis TIMESTAMP,
FOREIGN KEY (foititis)
REFERENCES foititis(username)
ON DELETE CASCADE ON UPDATE CASCADE,
FOREIGN KEY (diplomatiki)
REFERENCES diplomatiki (id)
ON DELETE CASCADE ON UPDATE CASCADE
);


create table canceled_theses (
diplomatiki_id int(10) AUTO_INCREMENT PRIMARY KEY,
titlos varchar(150) NOT NULL,
foititis varchar(9) NOT NULL,
kathigitis VARCHAR (15) NOT NULL,
arithmos_gs int(10) NOT NULL,
etos year NOT NULL,
apologia text NOT NULL
);


CREATE TABLE anathetei(
kathigitis VARCHAR(15) NOT NULL,
diplomatiki INT NOT NULL,
FOREIGN KEY (kathigitis)
REFERENCES kathigitis(username)
ON DELETE CASCADE ON UPDATE CASCADE,
FOREIGN KEY (diplomatiki)
REFERENCES diplomatiki (id)
ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE exetasi(
diplomatiki INT PRIMARY KEY,
tropos_exetasis ENUM ('Dia Zosis','Diadiktiaka'),
aithousa VARCHAR(15),
link VARCHAR(250),
imerominia DATE,
ora TIME,
proxeiro_keimeno VARCHAR(250) NULL,
FOREIGN KEY (diplomatiki)
REFERENCES diplomatiki(id)
ON DELETE CASCADE ON UPDATE CASCADE
);


create table links(
link_number INT AUTO_INCREMENT PRIMARY KEY,
link VARCHAR(480),
diplomatiki_id INT,
FOREIGN KEY (diplomatiki_id) REFERENCES exetasi(diplomatiki) ON DELETE CASCADE
);


CREATE TABLE announcements(
  id INT AUTO_INCREMENT PRIMARY KEY,
  diplomatiki_id INT NOT NULL UNIQUE,
  author VARCHAR(15) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ann_dipl FOREIGN KEY (diplomatiki_id) REFERENCES diplomatiki(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------INSERTIONS------------------------------ --

SHOW TABLES;
DESCRIBE kathigitis;
INSERT INTO kathigitis VALUES('Fotio','fotio_kodikos','TEE','fotio@ceid.upatras.gr','Φώτης','Ιωαννίδης', 6912312312);
INSERT INTO kathigitis VALUES('Ante','ante_kodikos','TEE','jumper@ceid.upatras.gr','Γιάννης','Αντετοκούνμπο',6912312313);
INSERT INTO kathigitis VALUES('Ivan','ivan_kodikos','DEP','ivan@ceid.upatras.gr','Ιβάν','Γιοβάνοβιτς',6912315312);
INSERT INTO kathigitis VALUES('Lando','lando_kodikos','EEP','lando@ceid.upatras.gr','Lando','Norris',6912312912);
INSERT INTO kathigitis VALUES('Sloukas','sloukas_kodikos','EDIP','sloukas@ceid.upatras.gr','Κωνσταντίνος','Σλούκας',6912112312);
INSERT INTO kathigitis VALUES('Juancho','juancho_kodikos','ETEP','juancho@ceid.upatras.gr','Juancho','Hernangomez',6912312912);

DESCRIBE foititis;
INSERT INTO foititis VALUES ('1234567','up1234567','kodikos_up1234567','Μανώλης','Τζανής','2021','up1234567@ceid.upatras.gr','6912345678','2112345678','Μαιζώνος 17');
INSERT INTO foititis VALUES ('1010101','up1010101','kodikos_up1010101','Βασίλης','Παπαδημητρίου','2018','up1010101@ceid.upatras.gr','1010101010','2101010101','Κανακάρη 32');
INSERT INTO foititis VALUES ('2020202','up2020202','kodikos_up2020202','Αλέξανδρος','Πινακάς','2019','up2020202@ceid.upatras.gr','2020202020','2202020202','Κορίνθου 10');
INSERT INTO foititis VALUES ('3030303','up3030303','kodikos_up3030303','Ιωάννα','Μανωλοπούλου','2020','up3030303@ceid.upatras.gr','3030303030','2303030303','Καρόλου 4');
INSERT INTO foititis VALUES ("9090909","up9090909", "kodikos_up9090909","Μαρία","Παλιαλέξη","2021","up9090909@ceid.upatras.gr","9090909090","2319009123", "Καραϊσκάκη 48");
INSERT INTO foititis VALUES ("7070707","up7070707", "kodikos_up7070707","Αικατερίνη","Πετροπούλου","2018","up7070707@ceid.upatras.gr","7070707070","2929992292", "Ζακύνθου 37");
INSERT INTO foititis VALUES ("6060606","up6060606", "kodikos_up6060606","Πέτρος","Ιωσηφίδης","2012","up6060606@ceid.upatras.gr","6060606060","2882828228", "Λαμίας 2");
INSERT INTO foititis VALUES ("5050505","up5050505", "kodikos_up5050505","Μάριος","Δημητρίου","2016","up5050505@ceid.upatras.gr","5050505050","2828282205", "Αγίου Ανδρέου 15");
INSERT INTO foititis VALUES ("8080808","up8080808", "kodikos_up8080808","Αναστασία","Γεωργαντά","2022","up8080808@ceid.upatras.gr","8080808080","2328282201", "Ζαϊμη 5");
INSERT INTO foititis VALUES ("9876543","up9876543", "kodikos_up9876543","Μαρία","Παπαδοπούλου","2021","up9876543@ceid.upatras.gr","9876543210","2325282201", "Κανακάρη 5");

DESCRIBE grammateia;
INSERT INTO grammateia VALUES('gram1','gram1_kodikos',6912345678,'gram1@gmail.com','Δήμητρα','Γεωργίου');
INSERT INTO grammateia VALUES('gram2','gram2_kodikos',6913345679,'gram2@gmail.com','Ελένη','Παπαδοπούλου');
INSERT INTO grammateia VALUES('gram3','gram3_kodikos',6914345671,'gram3@gmail.com','Πηνελόπη','Κωνσταντινίδου');

DESCRIBE diplomatiki;
INSERT INTO diplomatiki VALUES(1,'Ανάλυση δεδομένων','Τεστ 1','Αρχείο 1',NULL,'Does not meet requirements','False','Fotio',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO diplomatiki VALUES(2,'Μικροεπεξεργαστές','Τεστ 2','Αρχείο 2',NULL,'Does not meet requirements','False','Fotio',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO diplomatiki VALUES(3,'Δίκτυα υπολογιστών','Τεστ 3','Αρχείο 3',NULL,'Does not meet requirements','False','Ante',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO diplomatiki VALUES(4,'Μηχανική μάθηση','Τεστ 4','Αρχείο 4',NULL,'Does not meet requirements','False','Ivan',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO diplomatiki VALUES(5,'Νευρωνικά δίκτυα','Τεστ 5','Αρχείο 5',NULL,'Does not meet requirements','False','Lando',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO diplomatiki VALUES(6,'Θεωρία παιγνίων','Τεστ 6','Αρχείο 6',NULL,'Does not meet requirements','False','Sloukas',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO diplomatiki VALUES(7,'Βιοπληροφορική','Τεστ 7','Αρχείο 7',NULL,'Does not meet requirements','False','Juancho',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO diplomatiki VALUES(8,'Δομές Δεδομένων','Τεστ 8','Αρχείο 8',NULL,'Does not meet requirements','False','Fotio',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO diplomatiki VALUES(9,'Τεχνολογία Λογισμικού','Τεχν','Αρχείο 9',NULL,'Does not meet requirements','False','Fotio',NULL,NULL,NULL,NULL,NULL,NULL,NULL);
INSERT INTO diplomatiki VALUES(10,'Τεχνητή Νοημοσύνη','AI','Αρχείο 10',NULL,'Does not meet requirements','False','Ivan',NULL,NULL,NULL,NULL,NULL,NULL,NULL);

DESCRIBE anathetei;
INSERT INTO anathetei VALUES('Fotio',1);
INSERT INTO anathetei VALUES('Fotio',2);
INSERT INTO anathetei VALUES('Ante',3);
INSERT INTO anathetei VALUES('Ivan',4);
INSERT INTO anathetei VALUES('Lando',5);
INSERT INTO anathetei VALUES('Sloukas',6);
INSERT INTO anathetei VALUES('Juancho',7);

DESCRIBE analamvanei;
INSERT INTO analamvanei VALUES('up1234567',1,NULL,NULL);
INSERT INTO analamvanei VALUES('up1010101',2,NULL,NULL);
INSERT INTO analamvanei VALUES('up2020202',3,NULL,NULL);
INSERT INTO analamvanei VALUES('up3030303',4,NULL,NULL);
insert into analamvanei VALUES('up9090909',7,NULL,NULL);
insert into analamvanei VALUES('up7070707',5,NULL,NULL);
insert into analamvanei VALUES('up6060606',6,NULL,NULL);
