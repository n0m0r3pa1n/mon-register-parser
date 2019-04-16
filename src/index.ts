import * as KinderGardens from "../gradini.json"

import cheerio from 'cheerio';
import * as fs from 'fs';
require('dotenv').config();
import rp from "request-promise";

class Main {
    constructor() { }

    parseKinderGardens() {
        const kinderGardens: Array<KinderGarden> = KinderGardens.data;
        const promises = kinderGardens.slice(0, 1).map(garden => this.parseGarden(garden))
       
        Promise.all(promises).then(values => {
            console.log(values)
            fs.writeFile("./test.json", JSON.stringify(values), function (err) {
                if (err) {
                    return console.log(err);
                }

                console.log("The file was saved!");
            });
        })
        // this.parseGarden()

    }

    parseGarden(garden: KinderGarden) {

        var cookiejar = rp.jar();
        return Promise.resolve(garden)
            .then(resp => {
                const url = `http://89.252.196.217/Schools/Backend?action=school&id=${garden.schoolId}`
                return rp.post({ url, jar: cookiejar })
                    .then(school => Promise.resolve(resp))
            })
            .then(resp => {
                const url = `http://89.252.196.217/Schools/schinfo?${Math.floor((Math.random() * 100000) + 1)}`
                console.log(url)
                return rp.get({ url, jar: cookiejar })
                    .then(html => {
                        const $ = cheerio.load(html);
                        resp.postCode = $("div.contact-info div.row").eq(1).find("span.text").text().split(",")[0]
                        resp.address = $("div.contact-info div.row").eq(2).find("span.text").text()
                        resp.municipality = $("div.contact-info div.row").eq(0).find("div.col-md-3").eq(1).find("span.text").text()
                        console.log($("div.contact-info div.row").eq(2).find("span.text").text());

                        return Promise.resolve(resp)
                    })
            }
            )
            .then(resp => {
                const address = `${resp.address}, ${resp.place}`
                console.log(address);

                return rp.get({
                    uri: `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.MAPS_API_KEY}`,
                    json: true
                })
                    .then(resp => {
                        const result = resp.results[0].geometry
                        let placeId = null
                        if (resp.results[0].place_id) {
                            placeId = resp.results[0].place_id
                        }

                        const mapData = new GoogleMapData(new Location(result.location.lat, result.location.lng), placeId = placeId)
                        garden.mapData = mapData
                        console.log(garden.mapData)
                        return Promise.resolve(garden)
                    })
            })
            .catch(error => console.log(error))
    }
}

class KinderGarden {
    schoolId: number;
    schoolName: string;
    schoolType: string;
    place: string;
    area: string;
    ownership: string;
    status: string;
    address?: string = "";
    postCode?: string = "";
    municipality?: string = "";
    mapData?: GoogleMapData
}

class GoogleMapData {
    constructor(readonly location: Location, readonly placeId?: string) { }
}

class Location {
    constructor(readonly lat: number, readonly lng: number) { }
}

new Main().parseKinderGardens();
