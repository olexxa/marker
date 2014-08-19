package com.softedge.marker.detector;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfPoint;
import org.opencv.core.MatOfPoint2f;
import org.opencv.core.Point;
import org.opencv.core.Size;
import org.opencv.core.TermCriteria;
import org.opencv.imgproc.Imgproc;
import org.opencv.utils.Converters;

public class MarkerDetector {
    private Size markerSize;
    private float minContourLengthAllowed;
    private Mat thresholdImg = new Mat();
    private Mat grayscaleImage = new Mat();
    private Mat canonicalMarkerImage = new Mat();

    private List<Marker> markers;
    private List<MatOfPoint> contours;
    private List<Point> markerCorners2d;
    
    public MarkerDetector(int minContourLengthAllowed, Size markerSize) {
        this.markerSize = markerSize;
        this.markers = new ArrayList<Marker>();
        this.contours = new ArrayList<MatOfPoint>();
        this.markerCorners2d = new ArrayList<Point>();
        this.minContourLengthAllowed = minContourLengthAllowed;

        this.markerCorners2d.add(new Point(0, 0));
        this.markerCorners2d.add(new Point((int) markerSize.width - 1, 0));
        this.markerCorners2d.add(new Point((int) markerSize.width - 1, (int) markerSize.height - 1));
        this.markerCorners2d.add(new Point(0, (int) markerSize.height - 1));
    }

    public List<Marker> getMarkers() {
        return markers;
    }

    // Searches for markers and fills the list of transformation for found markers
    public void processImage(Mat image) {
        markers.clear();
        findMarkers(image, markers);
    }

    // Main marker detection routine
    public void findMarkers(Mat bgraMat, List<Marker> detectedMarkers) {
        // Convert the image to grayscale
        prepareImage(bgraMat, grayscaleImage);

        // Make it binary
        performThreshold(grayscaleImage, thresholdImg);

        // Detect contours
        findContours(thresholdImg, contours, grayscaleImage.cols() / 5);

        // Find closed contours that can be approximated with 4 points
        findCandidates(contours, detectedMarkers);

        // Find is them are markers
        recognizeMarkers(grayscaleImage, detectedMarkers);

        //sort by id
        Collections.sort(detectedMarkers, new Comparator<Marker>() {

            @Override
            public int compare(Marker m1, Marker m2) {
                if (m1.id < m2.id)
                    return -1;
                else if (m1.id > m2.id)
                    return 1;
                return 0;
            }
        });
    }

    // Converts image to grayscale
    public void prepareImage(Mat bgraMat, Mat grayscale) {
        Imgproc.cvtColor(bgraMat, grayscale, Imgproc.COLOR_BGRA2GRAY);
    }

    // Performs binary threshold
    public void performThreshold(Mat grayscale, Mat thresholdImg) {
        Imgproc.threshold(grayscale, thresholdImg, 127, 255, Imgproc.THRESH_BINARY_INV);
    }

    // Detects appropriate contours
    public void findContours(Mat thresholdImg, List<MatOfPoint> contours, int minContourPointsAllowed) {
        List<MatOfPoint> allContours = new ArrayList<MatOfPoint>();

        Imgproc.findContours(thresholdImg, allContours, new Mat(), Imgproc.RETR_LIST, Imgproc.CHAIN_APPROX_NONE);

        contours.clear();
        for (int i = 0; i < allContours.size(); i++) {
            long contourSize = allContours.get(i).total();
            if (contourSize > minContourPointsAllowed) {
                contours.add(allContours.get(i));
            }
        }
    }

    // Finds marker candidates among all contours
    public void findCandidates(List<MatOfPoint> contours, List<Marker> detectedMarkers) {
        ArrayList<Marker> possibleMarkers = new ArrayList<Marker>();

        // For each contour, analyze if it is a parallelepiped likely to be the marker
        for (int i = 0; i < contours.size(); i++) {
            // Approximate to a polygon
            double eps = contours.get(i).total() * 0.05;
            MatOfPoint2f approxCurve = new MatOfPoint2f();
            MatOfPoint2f curve = new MatOfPoint2f();
            contours.get(i).convertTo(curve, CvType.CV_32FC2);
            Imgproc.approxPolyDP(curve, approxCurve, eps, true);

            // We interested only in polygons that contains only four points
            if (approxCurve.total() != 4)
                continue;

            MatOfPoint conv = new MatOfPoint();
            approxCurve.convertTo(conv, CvType.CV_32S);

            // And they have to be convex
            if (!Imgproc.isContourConvex(conv))
                continue;

            // Ensure that the distance between consecutive points is large enough
            double minDist = Double.MAX_VALUE;

            Point[] points = approxCurve.toArray();
            for (int j = 0; j < 4; j++) {
                Point side = new Point(points[j].x - points[(j + 1) % 4].x, points[j].y - points[(j + 1) % 4].y);
                double squaredSideLength = side.dot(side);
                minDist = Math.min(minDist, squaredSideLength);
            }

            // Check that distance is not very small
            if (minDist < minContourLengthAllowed)
                continue;

            // All tests are passed. Save marker candidate:
            Marker m = new Marker();

            for (int j = 0; j < 4; j++)
                m.points.add(new Point((float) points[j].x, (float) points[j].y));

            // Sort the points in anti-clockwise order
            // Trace a line between the first and second point.
            // If the third point is at the right side, then the points are anti-clockwise
            Point v1 = new Point(m.points.get(1).x - m.points.get(0).x, m.points.get(1).y - m.points.get(0).y);
            Point v2 = new Point(m.points.get(2).x - m.points.get(0).x, m.points.get(2).y - m.points.get(0).y);

            double o = (v1.x * v2.y) - (v1.y * v2.x);

            if (o < 0.0) //if the third point is in the left side, then sort in anti-clockwise order
                Collections.swap(m.points, 1, 3);

            possibleMarkers.add(m);
        }

        // Remove these elements which corners are too close to each other.
        // First detect candidates for removal:
        List<Pair<Integer, Integer>> tooNearCandidates = new ArrayList<Pair<Integer, Integer>>();
        for (int i = 0; i < possibleMarkers.size(); i++) {
            Marker m1 = possibleMarkers.get(i);

            //calculate the average distance of each corner to the nearest corner of the other marker candidate
            for (int j = i + 1; j < possibleMarkers.size(); j++) {
                Marker m2 = possibleMarkers.get(j);

                float distSquared = 0;

                for (int c = 0; c < 4; c++) {
                    Point v = new Point(m1.points.get(c).x - m2.points.get(c).x, m1.points.get(c).y
                            - m2.points.get(c).y);
                    distSquared += v.dot(v);
                }

                distSquared /= 4;

                if (distSquared < 100)
                    tooNearCandidates.add(new Pair<Integer, Integer>(i, j));
            }
        }

        // Mark for removal the element of the pair with smaller perimeter
        Boolean[] removalMask = new Boolean[possibleMarkers.size()];
        Arrays.fill(removalMask, Boolean.FALSE);

        for (int i = 0; i < tooNearCandidates.size(); i++) {
            double p1 = perimeter(possibleMarkers.get(tooNearCandidates.get(i).getFirst()).points);
            double p2 = perimeter(possibleMarkers.get(tooNearCandidates.get(i).getSecond()).points);

            int removalIndex;
            if (p1 > p2)
                removalIndex = tooNearCandidates.get(i).getSecond();
            else
                removalIndex = tooNearCandidates.get(i).getFirst();

            removalMask[removalIndex] = true;
        }

        // Return candidates
        detectedMarkers.clear();
        for (int i = 0; i < possibleMarkers.size(); i++) {
            if (!removalMask[i])
                detectedMarkers.add(possibleMarkers.get(i));
        }
    }

    double perimeter(List<Point> a) {
        double sum = 0, dx, dy;

        for (int i = 0; i < a.size(); i++) {
            int i2 = (i + 1) % a.size();

            dx = a.get(i).x - a.get(i2).x;
            dy = a.get(i).y - a.get(i2).y;

            sum += Math.sqrt(dx * dx + dy * dy);
        }

        return sum;
    }

    // Tries to recognize markers by detecting marker code
    public void recognizeMarkers(Mat grayscale, List<Marker> detectedMarkers) {
        List<Marker> goodMarkers = new ArrayList<Marker>();

        // Identify the markers
        for (int i = 0; i < detectedMarkers.size(); i++) {
            Marker marker = detectedMarkers.get(i);

            Mat pointsMat = Converters.vector_Point2f_to_Mat(marker.points);
            Mat cornersMat = Converters.vector_Point2f_to_Mat(markerCorners2d);
            // Find the perspective transformation that brings current marker to rectangular form
            Mat markerTransform = Imgproc.getPerspectiveTransform(pointsMat, cornersMat);

            // Transform image to get a canonical marker image
            Imgproc.warpPerspective(grayscale, canonicalMarkerImage, markerTransform, markerSize);

            int nRotations = marker.getMarkerId(canonicalMarkerImage);
            if (marker.id != -1) {
                // sort the points so that they are always in the same order no matter the camera orientation
                Collections.rotate(marker.points, 4 - nRotations);
                goodMarkers.add(marker);
            }
        }

        // Refine marker corners using sub pixel accuracy
        if (goodMarkers.size() > 0) {
            Point[] preciseCorners = new Point[4 * goodMarkers.size()];

            for (int i = 0; i < goodMarkers.size(); i++) {
                Marker marker = goodMarkers.get(i);
                for (int c = 0; c < 4; c++)
                    preciseCorners[i * 4 + c] = marker.points.get(c);
            }

            TermCriteria termCriteria = new TermCriteria(TermCriteria.MAX_ITER | TermCriteria.EPS, 30, 0.01);
            Imgproc.cornerSubPix(grayscale, new MatOfPoint2f(preciseCorners), new Size(5, 5), new Size(-1, -1), termCriteria);

            // Copy refined corners position back to markers
            for (int i = 0; i < goodMarkers.size(); i++) {
                Marker marker = goodMarkers.get(i);

                for (int c = 0; c < 4; c++)
                    marker.points.set(c, preciseCorners[i * 4 + c]);
            }
        }

        detectedMarkers.clear();
        detectedMarkers.addAll(goodMarkers);
    }
}
