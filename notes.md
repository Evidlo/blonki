# Blonki - web anki

I am building a web-based Anki client SPA.  It will have the following tabs: Learn, Edit, Stats, Settings, Extras.  I will describe the user flows of each of these views.

## learn 
    - 1st view: table that shows the available decks which can be selected.  
    - 2nd view: shows the front side of a card, then shows the back when triggered by user.  the user then selects "correct" or "incorrect" to indicate whether they got the answer right

## edit
    - 1st view: table that shows the available decks which can be selected.  
    - 2nd view: shows the front and back side of a card, which can be edited.  the user can then save the changes.

## stats
    - 1st view: shows a grid of cards, each with its own plot: Reviews (line plot with number of reviews over last month)
    - we will expand on this more later

## settings
    - 1st view: shows a list of settings, each with its own input field.  the user can then save the changes.
    - we will expand on this more later

## extras
    - empty view for now, intent is to be able to add plugins

# general guidelines and technical details
    - should be able to navigate back to lower level views with back button or `esc` button
    - data is stored in either browser local storage or on the host filesystem via the Filesystem API, configurable with a setting
        - browser should detect support for the Filesystem API and warn in alert if not supported
    - should be able to support apkg files for now, with later support for other file types

