package com.softedge.marker.detector;

import java.util.ArrayList;
import java.util.List;

import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.Point;
import org.opencv.core.Rect;
import org.opencv.imgproc.Imgproc;

public class Marker {
    public int square = 1;
    public int id;
    public List<Point> points;

    public Marker() {
        this.points = new ArrayList<Point>();
    }

    private static Mat rotate(Mat in) {
        Mat out = new Mat();
        in.copyTo(out);
        for (int i = 0; i < in.rows(); i++) {
            for (int j = 0; j < in.cols(); j++) {
                out.put(i, j, in.get(in.cols() - j - 1, i));
            }
        }
        return out;
    }

    private final static int hammDistMarker(Mat bits) {
        int[][] ids = new int[][] { { 1, 0, 0, 0, 0 }, { 1, 0, 1, 1, 1 }, { 0, 1, 0, 0, 1 }, { 0, 1, 1, 1, 0 } };

        int dist = 0;

        for (int y = 0; y < 5; y++) {
            int minSum = 10 ^ 5; // hamming distance to each possible word
            for (int p = 0; p < 4; p++) {
                int sum = 0;
                //now, count
                for (int x = 0; x < 5; x++) {
                    sum += bits.get(y, x)[0] == ids[p][x] ? 0 : 1;
                }

                if (minSum > sum)
                    minSum = sum;
            }

            // do the and
            dist += minSum;
        }

        return dist;
    }

    private final static int mat2id(Mat bits) {
        int val = 0;
        for (int y = 0; y < 5; y++) {
            val <<= 1;
            if (bits.get(y, 1)[0] != 0)
                val |= 1;
            val <<= 1;
            if (bits.get(y, 3)[0] != 0)
                val |= 1;
        }
        return val;
    }

    public int getMarkerId(Mat markerImage) {
        Mat grey = markerImage;

        // Threshold image
        Imgproc.threshold(grey, grey, 125, 255, Imgproc.THRESH_BINARY | Imgproc.THRESH_OTSU);

        // Markers  are divided in 7x7 regions, of which the inner 5x5 belongs to marker info
        // the external border should be entirely black

        int cellSize = markerImage.rows() / 7;

        for (int y = 0; y < 7; y++) {
            int inc = 6;

            if (y == 0 || y == 6)
                inc = 1; // for first and last row, check the whole border

            for (int x = 0; x < 7; x += inc) {
                int cellX = x * cellSize;
                int cellY = y * cellSize;

                Mat cell = grey.submat(new Rect(cellX, cellY, cellSize, cellSize));

                int nZ = Core.countNonZero(cell);

                if (nZ > (cellSize * cellSize) / 2) {
                    this.id = -1;
                    return 0; // can not be a marker because the border element is not black!
                }
            }
        }

        Mat bitMatrix = Mat.zeros(5, 5, CvType.CV_8UC1);

        // get information(for each inner square, determine if it is  black or white)
        for (int y = 0; y < 5; y++) {
            for (int x = 0; x < 5; x++) {
                int cellX = (x + 1) * cellSize;
                int cellY = (y + 1) * cellSize;
                Mat cell = grey.submat(new Rect(cellX, cellY, cellSize, cellSize));

                int nZ = Core.countNonZero(cell);
                if (nZ > (cellSize * cellSize) / 2)
                    bitMatrix.put(y, x, 1);
            }
        }

        // check all possible rotations
        Mat[] rotations = new Mat[4];
        Integer[] distances = new Integer[4];

        rotations[0] = bitMatrix;
        distances[0] = hammDistMarker(rotations[0]);

        Pair<Integer, Integer> minDist = new Pair<Integer, Integer>(distances[0], 0);

        for (int i = 1; i < 4; i++) {
            // get the hamming distance to the nearest possible word
            rotations[i] = rotate(rotations[i - 1]);
            distances[i] = hammDistMarker(rotations[i]);

            if (distances[i] < minDist.getFirst()) {
                minDist.setFirst(distances[i]);
                minDist.setSecond(i);
            }
        }

        if (minDist.getFirst() == 0) {
            this.id = mat2id(rotations[minDist.getSecond()]);
        } else {
            this.id = -1;
        }

        return minDist.getSecond();
    }

    @Override
    public String toString() {
        return "id: " + id + ", points: " + points + ", square: " + square;
    }
}
