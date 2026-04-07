#include "utils.hpp"
#include "json.hpp"
using json = nlohmann::json;

json convertToJson(const Result& res) {
    json j;
    j["algorithm"]  = res.algorithm;
    j["faults"]     = res.faults;
    j["hits"]       = res.hits;
    j["hitRatio"]   = res.hitRatio;
    j["faultRatio"] = res.faultRatio;

    for (auto& step : res.steps) {
        json s;
        s["page"]     = step.page;
        s["frames"]   = step.frames;
        s["hit"]      = step.hit;
        s["replaced"] = step.replaced;
        s["reason"]   = step.reason;
        j["steps"].push_back(s);
    }
    return j;
}

int main(int argc, char* argv[]) {
    int n, capacity;
    vector<int> pages;
    bool useRandom = false;

    // Support command-line: ./run <capacity> <page1> <page2> ...
    if (argc >= 3) {
        capacity = stoi(argv[1]);
        for (int i = 2; i < argc; i++)
            pages.push_back(stoi(argv[i]));
        n = (int)pages.size();
    } else {
        cout << "Enter number of pages: ";
        cin >> n;

        cout << "Enter pages (or -1 to generate random): ";
        int tmp;
        cin >> tmp;
        if (tmp == -1) {
            useRandom = true;
            pages = generateRandomPages(n, 10);
            cout << "Generated: ";
            for (int p : pages) cout << p << " ";
            cout << "\n";
        } else {
            pages.push_back(tmp);
            for (int i = 1; i < n; i++) { cin >> tmp; pages.push_back(tmp); }
        }

        cout << "Enter number of frames: ";
        cin >> capacity;
    }

    Result f = fifo(pages, capacity);
    Result l = lru(pages, capacity);
    Result o = optimal(pages, capacity);
    Result lf = lfu(pages, capacity);

    json output;
    output["input"]["pages"]    = pages;
    output["input"]["capacity"] = capacity;
    output["results"].push_back(convertToJson(f));
    output["results"].push_back(convertToJson(l));
    output["results"].push_back(convertToJson(o));
    output["results"].push_back(convertToJson(lf));

    // Analysis: faults vs frame count for all algos
    int maxFrames = capacity + 5;
    auto fifoMap    = simulateFIFOFrames(pages, maxFrames);
    auto lruMap     = simulateLRUFrames(pages, maxFrames);
    auto optimalMap = simulateOptimalFrames(pages, maxFrames);

    for (auto& p : fifoMap) {
        output["analysis"]["fifoFrames"].push_back({{"frames", p.first}, {"faults", p.second}});
    }
    for (auto& p : lruMap) {
        output["analysis"]["lruFrames"].push_back({{"frames", p.first}, {"faults", p.second}});
    }
    for (auto& p : optimalMap) {
        output["analysis"]["optimalFrames"].push_back({{"frames", p.first}, {"faults", p.second}});
    }

    bool belady = detectBelady(fifoMap);
    output["analysis"]["beladyAnomaly"] = belady;
    output["analysis"]["beladyDescription"] =
        belady
        ? "Belady's Anomaly detected! FIFO shows MORE faults with MORE frames at some point."
        : "No Belady's Anomaly detected in FIFO for this sequence.";

    // Write JSON
    ofstream file("../data/output.json");
    file << output.dump(4);
    file.close();
    cout << "\n✅ JSON written to data/output.json\n";

    // Write CSV summary
    ofstream csv("../data/results.csv");
    csv << "Algorithm,Faults,Hits,HitRatio,FaultRatio\n";
    for (auto& r : {f, l, o, lf}) {
        csv << r.algorithm << "," << r.faults << "," << r.hits << ","
            << r.hitRatio << "," << r.faultRatio << "\n";
    }
    csv.close();
    cout << "✅ CSV written to data/results.csv\n";

    return 0;
}
